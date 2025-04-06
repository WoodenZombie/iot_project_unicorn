#include <driver/i2s.h>
#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include "esp_task_wdt.h"
#include <algorithm>  // For std::min

// Hardware Configuration
#define I2S_SD 15
#define I2S_WS 16
#define I2S_SCK 7
#define I2S_PORT I2S_NUM_0

// Audio Buffer Settings
#define BUFFER_COUNT 8
#define BUFFER_LEN 1024
int16_t audioBuffer[BUFFER_LEN];

// Network Configuration
const char* ssid = "Tetiana - iPhone";
const char* password = "123123123";
const char* websocket_server_host = "172.20.10.4";
const uint16_t websocket_server_port = 8888;

using namespace websockets;
WebsocketsClient client;
bool isWebSocketConnected = false;
uint32_t lastReconnectAttempt = 0;
TaskHandle_t audioTaskHandle = NULL;

// ==================== Audio Processing ====================
void applyHighPassFilter(int16_t* buffer, size_t samples) {
  static int16_t last_sample = 0;
  const float alpha = 0.95;
  for(size_t i=0; i<samples; i++) {
    buffer[i] = alpha * (last_sample + buffer[i] - ((i>0) ? buffer[i-1] : 0));
    last_sample = buffer[i];
  }
}

void plotAudioWaveform(int16_t* samples, size_t count) {
  size_t display_samples = std::min<size_t>(count, 32);
  for(size_t i=0; i<display_samples; i++) {
    Serial.printf("%6d", samples[i]);
    int bars = map(abs(samples[i]), 0, 32768, 0, 20);
    for(int j=0; j<bars; j++) Serial.print("|");
    Serial.println();
  }
  Serial.println("------------------");
}

// ==================== I2S Setup ====================
void setupI2S() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = BUFFER_COUNT,
    .dma_buf_len = BUFFER_LEN,
    .use_apll = true
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);

  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };
  i2s_set_pin(I2S_PORT, &pin_config);
}

// ==================== WebSocket Events ====================
void onWebSocketEvent(WebsocketsEvent event, String data) {
  switch(event) {
    case WebsocketsEvent::ConnectionOpened:
      Serial.println("WebSocket Connected");
      isWebSocketConnected = true;
      break;
    case WebsocketsEvent::ConnectionClosed:
      Serial.println("WebSocket Disconnected");
      isWebSocketConnected = false;
      break;
    case WebsocketsEvent::GotPing:
      client.pong();
      break;
    default: break;
  }
}

// ==================== Network Connection ====================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

bool connectWebSocket() {
  client.onEvent(onWebSocketEvent);
  Serial.println("Connecting to WebSocket Server...");
  bool connected = client.connect(websocket_server_host, websocket_server_port, "/");
  
  if(connected) {
    Serial.println("WebSocket Connected!");
  } else {
    Serial.println("WebSocket Connection Failed!");
  }
  
  return connected;
}

// ==================== Audio Streaming Task ====================
void audioStreamTask(void* parameter) {
  esp_task_wdt_add(NULL);
  setupI2S();
  i2s_start(I2S_PORT);

  Serial.print("Audio Task Stack Free: ");
  Serial.println(uxTaskGetStackHighWaterMark(NULL));

  size_t bytesRead = 0;
  
  while(true) {
    esp_task_wdt_reset();
    
    if(!isWebSocketConnected) {
      vTaskDelay(pdMS_TO_TICKS(100));
      continue;
    }

    esp_err_t result = i2s_read(I2S_PORT, 
                              &audioBuffer, 
                              BUFFER_LEN * sizeof(int16_t),
                              &bytesRead, 
                              portMAX_DELAY);

    if(result == ESP_OK && bytesRead > 0) {
      size_t sampleCount = bytesRead / sizeof(int16_t);
      applyHighPassFilter(audioBuffer, sampleCount);
      
      // Debug visualization (comment out in production)
      plotAudioWaveform(audioBuffer, sampleCount);
      
      if(!client.sendBinary((const char*)audioBuffer, bytesRead)) {
        Serial.println("WebSocket Send Failed");
        isWebSocketConnected = false;
      }
    }
    
    vTaskDelay(pdMS_TO_TICKS(1));
  }
  
  esp_task_wdt_delete(NULL);
  vTaskDelete(NULL);
}

// ==================== Main Setup ====================
void setup() {
  Serial.begin(115200);
  
  // Initialize Task Watchdog
  esp_task_wdt_config_t twdt_config = {
    .timeout_ms = 30000,
    .idle_core_mask = 0,
    .trigger_panic = false
  };
  esp_task_wdt_init(&twdt_config);
  esp_task_wdt_add(NULL);
  
  connectWiFi();
  
  xTaskCreatePinnedToCore(
    audioStreamTask,
    "AudioStreamTask",
    8192,
    NULL,
    1,
    &audioTaskHandle,
    1
  );

  connectWebSocket();
  lastReconnectAttempt = millis();
}

// ==================== Main Loop ====================
void loop() {
  esp_task_wdt_reset();
  
  if(!isWebSocketConnected && (millis() - lastReconnectAttempt > 5000)) {
    if(WiFi.status() == WL_CONNECTED) {
      connectWebSocket();
    } else {
      WiFi.disconnect();
      connectWiFi();
    }
    lastReconnectAttempt = millis();
  }

  static uint32_t lastHeapCheck = 0;
  if(millis() - lastHeapCheck > 10000) {
    Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
    lastHeapCheck = millis();
  }

  if(isWebSocketConnected) {
    client.poll();
  }
  
  delay(10);
}
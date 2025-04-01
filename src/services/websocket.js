export class TranscriptionWebSocket {
    constructor(url, onMessageCallback) {
      this.socket = null;
      this.url = url;
      this.onMessageCallback = onMessageCallback;
    }
  
    connect(sessionId) {
      this.socket = new WebSocket(`${this.url}?sessionId=${sessionId}`);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
      };
  
      this.socket.onmessage = (event) => {
        this.onMessageCallback(event.data);
      };
  
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
      };
    }
  
    disconnect() {
      if (this.socket) {
        this.socket.close();
      }
    }
  
    send(message) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(message);
      }
    }
  }
import { useState, useEffect, useRef } from 'react';
import { createSession, stopSession } from './services/api';
import { TranscriptionWebSocket } from './services/websocket';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const websocketRef = useRef(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'default') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleStartSession = async () => {
    setIsLoading(true);
    try {
      const session = await createSession();
      setSessionId(session.id);
      setIsRecording(true);
      
      websocketRef.current = new TranscriptionWebSocket(
        import.meta.env.VITE_WS_URL,
        (data) => {
          setTranscript(prev => prev + ' ' + data);
        }
      );
      websocketRef.current.connect(session.id);
      
      showToast('Recording and transcription is now active', 'default');
    } catch (error) {
      showToast('Failed to start session', 'destructive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      await stopSession(sessionId);
      websocketRef.current?.disconnect();
      setIsRecording(false);
      
      showToast('Recording has been saved', 'default');
    } catch (error) {
      showToast('Failed to stop session', 'destructive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!sessionId) return;
    const shareLink = `${window.location.origin}/transcript/${sessionId}`;
    navigator.clipboard.writeText(shareLink);
    showToast('Share this link to allow others to view the transcript', 'default');
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    showToast('Transcript copied to clipboard', 'default');
  };

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <h1 className="app-header">IoT Speech Transcription</h1>
        
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title">Session Controls</h2>
          </div>
          <div className="card-content">
            <div className="controls-group">
              <button
                className={`btn btn-primary ${isRecording || isLoading ? 'disabled' : ''}`}
                onClick={handleStartSession}
                disabled={isRecording || isLoading}
              >
                {isLoading ? 'Starting...' : 'Start Session'}
              </button>
              <button
                className={`btn btn-destructive ${!isRecording || isLoading ? 'disabled' : ''}`}
                onClick={handleStopSession}
                disabled={!isRecording || isLoading}
              >
                {isLoading ? 'Stopping...' : 'Stop Session'}
              </button>
              {sessionId && (
                <button
                  className="btn btn-outline"
                  onClick={handleCopyShareLink}
                >
                  Copy Share Link
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Live Transcription</h2>
          </div>
          <div className="card-content">
            <textarea
              className="transcription-textarea"
              value={transcript}
              readOnly
              placeholder={isRecording ? 'Listening for speech...' : 'Start a session to begin transcription'}
            />
          </div>
          <div className="card-footer justify-between items-center">
            <div className="session-info">
              {sessionId && `Session ID: ${sessionId}`}
            </div>
            {transcript && (
              <button
                className="btn btn-outline"
                onClick={handleCopyTranscript}
              >
                <span className="mr-2">Copy</span>
                Copy
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className={`toast ${toast.show ? 'visible' : ''} ${toast.type}`}>
        {toast.message}
      </div>
    </div>
  );
}

export default App;
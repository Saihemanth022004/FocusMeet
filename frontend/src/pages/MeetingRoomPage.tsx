import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import socket from '../socket';

export default function MeetingRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isConnected, setIsConnected]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [transcript, setTranscript]         = useState<string[]>([]);
  const [currentChunk, setCurrentChunk]     = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect socket and join meeting room
    socket.connect();
    socket.emit('join_room', { meetingId: id });

    socket.on('connect',    () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('transcript_chunk', (data: { text: string; is_final: boolean }) => {
      if (data.is_final) {
        setTranscript(prev => [...prev, data.text]);
        setCurrentChunk('');
      } else {
        setCurrentChunk(data.text);
      }
    });

    return () => {
      socket.emit('leave_room', { meetingId: id });
      socket.disconnect();
    };
  }, [id]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript, currentChunk]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-900)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4"
           style={{ background: 'rgba(13,14,20,0.9)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-4">
          <Link to="/" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
            ← Back
          </Link>
          <span style={{ color: '#3d4066' }}>|</span>
          <span className="font-semibold" style={{ color: '#e2e4ef' }}>Meeting Room</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${isConnected ? 'badge-live' : 'badge-completed'}`}>
            {isConnected && <span className="live-dot" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8 gap-6">

        {/* Controls */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Live Transcription</h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {isRecording ? 'Recording in progress…' : 'Press record to start capturing audio'}
            </p>
          </div>
          <button
            id="record-btn"
            className={isRecording ? 'btn-secondary' : 'btn-primary'}
            onClick={() => {
              setIsRecording(r => !r);
              socket.emit(isRecording ? 'stop_recording' : 'start_recording', { meetingId: id });
            }}
            style={isRecording ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
          >
            {isRecording ? (
              <>
                <span className="live-dot" /> Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                Record
              </>
            )}
          </button>
        </div>

        {/* Transcript area */}
        <div className="glass-card flex-1 flex flex-col" style={{ minHeight: '400px' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            <h2 style={{ fontSize: '0.95rem', color: '#9ca3af' }}>
              TRANSCRIPT — {transcript.length} segment{transcript.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {transcript.length === 0 && !currentChunk ? (
              <p style={{ color: '#4b5563', textAlign: 'center', paddingTop: '3rem' }}>
                Transcript will appear here once recording starts.
              </p>
            ) : (
              <>
                {transcript.map((seg, i) => (
                  <div key={i} className="p-3 rounded-lg animate-fade-in"
                       style={{ background: 'var(--color-surface-700)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {seg}
                  </div>
                ))}
                {currentChunk && (
                  <div className="p-3 rounded-lg"
                       style={{ background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
                                fontSize: '0.95rem', lineHeight: '1.6', color: '#9ca3af' }}>
                    {currentChunk}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer action */}
        <div className="flex justify-end">
          <button id="end-meeting-btn" className="btn-secondary"
                  onClick={() => navigate(`/meetings/${id}`)}>
            End meeting & view summary →
          </button>
        </div>
      </div>
    </div>
  );
}

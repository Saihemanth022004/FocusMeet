/**
 * MeetingRoomPage — real-time audio transcription via Socket.IO + faster-whisper
 *
 * Persistence flow:
 *   1. User clicks "Start Meeting"
 *      → POST /api/meetings (title = "Meeting — {datetime}") → store meetingId
 *      → getUserMedia → MediaRecorder starts
 *   2. Every 3 s a WebM/Opus chunk is emitted to the server as "audio_chunk"
 *   3. Server transcribes incrementally and emits "transcript_chunk" events
 *   4. User clicks "Stop Meeting" → MediaRecorder stops → "end_meeting" emitted
 *   5. Server emits "meeting_complete"
 *      → PATCH /api/meetings/{meetingId}/transcript (transcript + duration)
 *      → navigate to /meetings/{meetingId}
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { createMeeting, saveTranscript } from '../api/meetings';

// ── Types ──────────────────────────────────────────────────────────────────

type RecordingState = 'idle' | 'recording' | 'processing' | 'saving' | 'done';

interface TranscriptSegment {
  id: number;
  text: string;
  isFinal: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
const CHUNK_INTERVAL_MS = 3000; // 3-second audio chunks

// ── Component ──────────────────────────────────────────────────────────────

export default function MeetingRoomPage() {
  const { id: urlMeetingId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [finalTranscript, setFinalTranscript] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const socketRef      = useRef<Socket | null>(null);
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const transcriptRef  = useRef<HTMLDivElement>(null);
  const segmentCounter = useRef(0);
  const meetingIdRef   = useRef<string | null>(urlMeetingId ?? null);
  const startTimeRef   = useRef<number | null>(null);

  // ── Auto-scroll transcript ───────────────────────────────────────────────
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [segments]);

  // ── Socket lifecycle ─────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(AI_SERVICE_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setWsConnected(true);
      setWsError(null);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      setWsConnected(false);
      setRecordingState((prev) =>
        prev === 'recording' || prev === 'processing' ? 'idle' : prev,
      );
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setWsError(`WebSocket connection failed: ${err.message}`);
      setWsConnected(false);
    });

    socket.on('transcript_chunk', (data: { text: string; is_final: boolean }) => {
      const text = data.text?.trim();
      if (!text) return;

      setSegments((prev) => {
        const last = prev[prev.length - 1];
        if (last && !last.isFinal) {
          return [...prev.slice(0, -1), { ...last, text, isFinal: data.is_final }];
        }
        return [...prev, { id: ++segmentCounter.current, text, isFinal: data.is_final }];
      });
    });

    socket.on('meeting_complete', async (data: { text: string; message?: string }) => {
      const transcript = data.text || data.message || '(no speech detected)';
      setFinalTranscript(transcript);
      setRecordingState('saving');

      // ── Persist transcript to Spring Boot ──────────────────────────────
      const mid = meetingIdRef.current;
      if (!mid) {
        console.warn('[Persist] No meetingId — skipping save');
        setRecordingState('done');
        return;
      }

      const durationSeconds = startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0;

      try {
        await saveTranscript(mid, transcript, durationSeconds);
        // Navigate to the meeting detail page
        navigate(`/meetings/${mid}`);
      } catch (err) {
        console.error('[Persist] Failed to save transcript:', err);
        setSaveError('Could not save transcript. Your transcript is shown below.');
        setRecordingState('done');
      }
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Server error:', data.message);
      setWsError(`Server error: ${data.message}`);
    });

    socketRef.current = socket;
  }, [navigate]);

  // Connect socket on mount
  useEffect(() => {
    connectSocket();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connectSocket]);

  // ── Start meeting ────────────────────────────────────────────────────────
  const startMeeting = useCallback(async () => {
    setMicError(null);
    setWsError(null);
    setSaveError(null);
    setSegments([]);
    setFinalTranscript(null);

    // 1. Create meeting record in DB (if we don't already have an ID from the URL)
    let activeMeetingId = meetingIdRef.current;
    if (!activeMeetingId) {
      try {
        const now = new Date();
        const title = `Meeting — ${now.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        const meeting = await createMeeting(title);
        activeMeetingId = meeting.id;
        meetingIdRef.current = meeting.id;
      } catch (err) {
        console.error('[Persist] Failed to create meeting:', err);
        setMicError('Could not create meeting. Please check your connection and try again.');
        return;
      }
    }

    // 2. Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
    } catch (err: unknown) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser and try again.'
          : err instanceof DOMException && err.name === 'NotFoundError'
          ? 'No microphone found. Please connect a microphone and try again.'
          : `Could not access microphone: ${(err as Error).message}`;
      setMicError(msg);
      return;
    }

    // 3. Connect socket if not already connected
    if (!socketRef.current?.connected) {
      connectSocket();
      await new Promise<void>((resolve) => {
        const s = socketRef.current!;
        if (s.connected) { resolve(); return; }
        s.once('connect', () => resolve());
        setTimeout(resolve, 2000);
      });
    }

    // 4. Determine supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    // 5. Create MediaRecorder
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (event.data.size === 0 || !socketRef.current?.connected) return;
      try {
        const arrayBuffer = await event.data.arrayBuffer();
        socketRef.current.emit('audio_chunk', arrayBuffer);
      } catch (err) {
        console.error('[MediaRecorder] Failed to emit chunk:', err);
      }
    };

    recorder.onerror = () => {
      setWsError('MediaRecorder error. Recording has stopped.');
      stopMeeting();
    };

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    // 6. Start recording
    startTimeRef.current = Date.now();
    recorder.start(CHUNK_INTERVAL_MS);
    setRecordingState('recording');
  }, [connectSocket]);

  // ── Stop meeting ─────────────────────────────────────────────────────────
  const stopMeeting = useCallback(() => {
    const recorder = mediaRecRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    mediaRecRef.current = null;

    setRecordingState('processing');
    socketRef.current?.emit('end_meeting', { meetingId: meetingIdRef.current });
  }, []);

  // ── Reconnect handler ────────────────────────────────────────────────────
  const handleReconnect = useCallback(() => {
    setWsError(null);
    socketRef.current?.connect();
  }, []);

  // ── Derived UI helpers ───────────────────────────────────────────────────
  const isIdle       = recordingState === 'idle';
  const isRecording  = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';
  const isSaving     = recordingState === 'saving';
  const isDone       = recordingState === 'done';

  const finalSegments = segments.filter((s) => s.isFinal);
  const interimSeg    = segments.find((s) => !s.isFinal);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-900)' }}>

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(13,14,20,0.95)',
          borderBottom: '1px solid rgba(99,102,241,0.12)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}
          >
            ← Dashboard
          </Link>
          <span style={{ color: '#3d4066' }}>|</span>
          <span className="font-semibold" style={{ color: '#e2e4ef' }}>
            Meeting Room
            {meetingIdRef.current && (
              <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '0.85rem' }}>
                {' '}— #{meetingIdRef.current.split('-')[0]}
              </span>
            )}
          </span>
        </div>

        {/* Connection + recording badges */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <span className="badge badge-live" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              <span className="live-dot" style={{ background: '#ef4444' }} />
              LIVE
            </span>
          )}
          <span className={`badge ${wsConnected ? 'badge-live' : 'badge-completed'}`}>
            {wsConnected ? <span className="live-dot" /> : null}
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8 gap-6">

        {/* ── Mic permission error ──────────────────────────────────────── */}
        {micError && (
          <div
            className="animate-fade-in"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🎙️</span>
            <div>
              <p style={{ color: '#f87171', fontWeight: 600, marginBottom: '0.25rem' }}>
                Microphone Access Error
              </p>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{micError}</p>
            </div>
            <button
              onClick={() => setMicError(null)}
              style={{ marginLeft: 'auto', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Save error ────────────────────────────────────────────────── */}
        {saveError && (
          <div
            className="animate-fade-in"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💾</span>
            <p style={{ color: '#fca5a5', fontSize: '0.9rem', flex: 1 }}>{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── WebSocket error + reconnect ───────────────────────────────── */}
        {wsError && (
          <div
            className="animate-fade-in"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '0.25rem' }}>
                Connection Issue
              </p>
              <p style={{ color: '#fcd34d', fontSize: '0.9rem' }}>{wsError}</p>
            </div>
            <button
              id="reconnect-btn"
              className="btn-secondary"
              onClick={handleReconnect}
              style={{ flexShrink: 0, borderColor: 'rgba(245,158,11,0.4)', color: '#fbbf24' }}
            >
              Reconnect
            </button>
          </div>
        )}

        {/* ── Controls card ─────────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Live Transcription</h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {isIdle       && 'Click "Start Meeting" to begin capturing audio.'}
                {isRecording  && 'Recording in progress — speak clearly into your microphone.'}
                {isProcessing && 'Processing final transcript…'}
                {isSaving     && 'Saving transcript to your account…'}
                {isDone       && 'Meeting complete. Your full transcript is ready.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Start button */}
              {(isIdle || isDone) && (
                <button
                  id="start-meeting-btn"
                  className="btn-primary"
                  onClick={startMeeting}
                  style={{ minWidth: '9rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  {isDone ? 'New Meeting' : 'Start Meeting'}
                </button>
              )}

              {/* Stop button */}
              {isRecording && (
                <button
                  id="stop-meeting-btn"
                  className="btn-secondary"
                  onClick={stopMeeting}
                  style={{
                    minWidth: '9rem',
                    borderColor: 'rgba(239,68,68,0.5)',
                    color: '#f87171',
                  }}
                >
                  <span
                    style={{
                      width: 10, height: 10,
                      background: '#ef4444',
                      borderRadius: 2,
                      display: 'inline-block',
                    }}
                  />
                  Stop Meeting
                </button>
              )}

              {/* Processing / saving spinner */}
              {(isProcessing || isSaving) && (
                <div className="flex items-center gap-2" style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                  <svg
                    width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  {isSaving ? 'Saving…' : 'Processing…'}
                </div>
              )}
            </div>
          </div>

          {/* Recording progress bar */}
          {isRecording && (
            <div style={{ marginTop: '1.25rem' }}>
              <div
                style={{
                  height: 3,
                  background: 'var(--color-surface-600)',
                  borderRadius: 9999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)',
                    backgroundSize: '200% 100%',
                    animation: 'recording-bar 2s linear infinite',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Final transcript card (shown after meeting_complete + save error) ── */}
        {isDone && finalTranscript !== null && (
          <div
            className="glass-card animate-fade-in"
            style={{ border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(99,102,241,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '0.9rem', color: '#a5b4fc', letterSpacing: '0.05em' }}>
                ✅ FINAL TRANSCRIPT
              </h2>
              {meetingIdRef.current && (
                <button
                  id="view-detail-btn"
                  className="btn-primary"
                  onClick={() => navigate(`/meetings/${meetingIdRef.current}`)}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                >
                  View Full Summary →
                </button>
              )}
            </div>
            <div
              style={{
                padding: '1.25rem',
                fontSize: '0.95rem',
                lineHeight: '1.75',
                color: '#d1d5db',
                whiteSpace: 'pre-wrap',
              }}
            >
              {finalTranscript || '(No speech was detected.)'}
            </div>
          </div>
        )}

        {/* ── Live transcript area ──────────────────────────────────────── */}
        <div
          className="glass-card flex flex-col"
          style={{ minHeight: 360, flex: 1 }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid rgba(99,102,241,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '0.85rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live Transcript — {finalSegments.length} segment{finalSegments.length !== 1 ? 's' : ''}
            </h2>
            {segments.length > 0 && (
              <button
                onClick={() => setSegments([])}
                style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Scrolling content */}
          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto"
            style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
          >
            {finalSegments.length === 0 && !interimSeg ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#374151',
                  gap: '0.75rem',
                  paddingTop: '3rem',
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.4">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <p style={{ fontSize: '0.9rem' }}>
                  {isRecording
                    ? 'Listening… transcript will appear shortly.'
                    : 'Start the meeting to see your transcript here.'}
                </p>
              </div>
            ) : (
              <>
                {finalSegments.map((seg) => (
                  <div
                    key={seg.id}
                    className="animate-fade-in"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.625rem',
                      background: 'var(--color-surface-700)',
                      fontSize: '0.95rem',
                      lineHeight: '1.65',
                      color: '#d1d5db',
                      borderLeft: '2px solid rgba(99,102,241,0.4)',
                    }}
                  >
                    {seg.text}
                  </div>
                ))}

                {/* Interim / streaming segment */}
                {interimSeg && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.625rem',
                      background: 'rgba(99,102,241,0.05)',
                      border: '1px dashed rgba(99,102,241,0.25)',
                      fontSize: '0.95rem',
                      lineHeight: '1.65',
                      color: '#6b7280',
                      fontStyle: 'italic',
                    }}
                  >
                    {interimSeg.text}
                    <span
                      style={{
                        display: 'inline-block',
                        width: 2,
                        height: '1em',
                        background: '#6366f1',
                        marginLeft: 3,
                        verticalAlign: 'text-bottom',
                        animation: 'blink 1s step-end infinite',
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Inline animation keyframes ────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes recording-bar {
          0%   { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

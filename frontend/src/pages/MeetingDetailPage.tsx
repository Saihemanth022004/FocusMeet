import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMeeting, type MeetingDetail } from '../api/meetings';

// ── Skeleton card ──────────────────────────────────────────────────────────

function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <div
      className="glass-card"
      style={{ height, overflow: 'hidden', position: 'relative' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.07) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMeeting(id)
      .then(setMeeting)
      .catch((err) => {
        console.error(err);
        setError('Could not load meeting details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>
        {/* Top bar skeleton */}
        <div
          style={{
            height: 57,
            background: 'rgba(13,14,20,0.9)',
            borderBottom: '1px solid rgba(99,102,241,0.12)',
          }}
        />
        <div className="max-w-4xl mx-auto px-6 py-10" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={280} />
        </div>
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
           style={{ background: 'var(--color-surface-900)' }}>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          {error ?? 'Meeting not found.'}
        </p>
        <Link to="/" className="btn-primary">← Go to Dashboard</Link>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const statusConfig = {
    SCHEDULED: { label: 'Scheduled', cls: 'badge-scheduled' },
    LIVE:      { label: 'Live',      cls: 'badge-live'      },
    COMPLETED: { label: 'Completed', cls: 'badge-completed' },
  };

  const durationLabel = meeting.durationSeconds
    ? `${Math.floor(meeting.durationSeconds / 60)}m ${meeting.durationSeconds % 60}s`
    : null;

  const dateLabel = new Date(meeting.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>

      {/* Top bar */}
      <div
        className="flex items-center gap-4 px-6 py-4 sticky top-0 z-10"
        style={{
          background: 'rgba(13,14,20,0.9)',
          borderBottom: '1px solid rgba(99,102,241,0.12)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link to="/" style={{ color: '#6b7280', fontSize: '0.875rem' }}>← Dashboard</Link>
        <span style={{ color: '#3d4066' }}>|</span>
        <span
          className="font-semibold"
          style={{
            color: '#e2e4ef',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '60vw',
          }}
        >
          {meeting.title}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── Meeting header card ──────────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{meeting.title}</h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {dateLabel}
                {durationLabel && ` · ${durationLabel}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${statusConfig[meeting.status].cls}`}>
                {meeting.status === 'LIVE' && <span className="live-dot" />}
                {statusConfig[meeting.status].label}
              </span>
              {(meeting.status === 'SCHEDULED' || meeting.status === 'LIVE') && (
                <Link id="join-room-btn" to={`/meetings/${id}/room`} className="btn-primary">
                  {meeting.status === 'LIVE' ? 'Rejoin room' : 'Start meeting'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Transcript card ──────────────────────────────────────────── */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Card header */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(99,102,241,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h2 style={{ fontSize: '0.85rem', color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Transcript
            </h2>
            {durationLabel && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(99,102,241,0.12)',
                  color: '#818cf8',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 9999,
                  fontWeight: 600,
                }}
              >
                {durationLabel}
              </span>
            )}
          </div>

          {/* Transcript content */}
          <div
            id="transcript-box"
            style={{
              maxHeight: '28rem',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
          >
            {meeting.transcript ? (
              <pre
                style={{
                  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.85',
                  color: '#d1d5db',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {meeting.transcript}
              </pre>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 1rem',
                  color: '#4b5563',
                  gap: '0.75rem',
                  textAlign: 'center',
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p style={{ fontSize: '0.9rem' }}>
                  {meeting.status === 'COMPLETED'
                    ? 'No transcript was recorded for this meeting.'
                    : 'Transcript will appear here once the meeting is completed.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

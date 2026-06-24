import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getMeeting,
  generateSummary,
  updateActionItemStatus,
  type MeetingDetail,
  type SummaryResult,
  type ActionItem,
  type ActionItemStatus,
} from '../api/meetings';

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

// ── Topic pill ────────────────────────────────────────────────────────────

function TopicPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        background: 'rgba(99,102,241,0.14)',
        color: '#a5b4fc',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 9999,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '0.25rem 0.75rem',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

// ── CheckIcon ────────────────────────────────────────────────────────────

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Section heading ───────────────────────────────────────────────────────

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      padding: '0.875rem 1.5rem',
      borderBottom: '1px solid rgba(99,102,241,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
    }}>
      {icon}
      <h2 style={{ fontSize: '0.8rem', color: '#a5b4fc', letterSpacing: '0.09em', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </h2>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI state
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  const handleGenerateSummary = useCallback(async () => {
    if (!id) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const result = await generateSummary(id);
      setSummary(result);
      setActionItems(result.savedActionItems ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate summary.';
      setSummaryError(msg);
    } finally {
      setSummarizing(false);
    }
  }, [id]);

  const handleToggleStatus = useCallback(async (item: ActionItem) => {
    setTogglingId(item.id);
    const next: ActionItemStatus = item.status === 'PENDING' ? 'DONE' : 'PENDING';
    try {
      const updated = await updateActionItemStatus(item.id, next);
      setActionItems((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
    } catch (err) {
      console.error('Failed to toggle action item status', err);
    } finally {
      setTogglingId(null);
    }
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>
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

  const canSummarize =
    meeting.status === 'COMPLETED' && !!meeting.transcript && !summarizing;

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

        {/* ── Topic pills (shown after summarize) ──────────────────────── */}
        {summary && summary.topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {summary.topics.map((t) => <TopicPill key={t} label={t} />)}
          </div>
        )}

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

          {/* Generate Summary button */}
          {meeting.status === 'COMPLETED' && meeting.transcript && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
              <button
                id="generate-summary-btn"
                onClick={handleGenerateSummary}
                disabled={summarizing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: summarizing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s',
                  background: summarizing
                    ? 'rgba(99,102,241,0.3)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  opacity: summarizing ? 0.7 : 1,
                  boxShadow: summarizing ? 'none' : '0 0 16px rgba(99,102,241,0.4)',
                }}
              >
                {summarizing ? (
                  <>
                    <Spinner />
                    Generating AI Summary…
                  </>
                ) : (
                  <>
                    {/* Sparkle icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17 5.8 21.2l2.4-7.3L2 9.4h7.6z"/>
                    </svg>
                    {summary ? 'Re-generate Summary' : 'Generate Summary'}
                  </>
                )}
              </button>
              {summaryError && (
                <p style={{ marginTop: '0.75rem', color: '#f87171', fontSize: '0.82rem' }}>
                  ⚠ {summaryError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── AI Summary card ───────────────────────────────────────────── */}
        {summary && (
          <div className="glass-card" style={{ overflow: 'hidden', animation: 'fade-in-up 0.4s ease both' }}>
            <SectionHeading
              label="AI Summary"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17 5.8 21.2l2.4-7.3L2 9.4h7.6z"/>
                </svg>
              }
            />
            <div style={{ padding: '1.5rem' }}>
              <p style={{
                color: '#d1d5db',
                lineHeight: '1.8',
                fontSize: '0.925rem',
                margin: 0,
              }}>
                {summary.summary}
              </p>
            </div>
          </div>
        )}

        {/* ── Decisions card ────────────────────────────────────────────── */}
        {summary && summary.decisions.length > 0 && (
          <div className="glass-card" style={{ overflow: 'hidden', animation: 'fade-in-up 0.5s ease both' }}>
            <SectionHeading
              label="Key Decisions"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
            />
            <ul style={{ listStyle: 'none', padding: '1rem 1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {summary.decisions.map((d, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <CheckIcon size={16} />
                  <span style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: '1.6' }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Action Items table ────────────────────────────────────────── */}
        {actionItems.length > 0 && (
          <div className="glass-card" style={{ overflow: 'hidden', animation: 'fade-in-up 0.6s ease both' }}>
            <SectionHeading
              label="Action Items"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 13h6M9 17h4" />
                </svg>
              }
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                    {['Task', 'Owner', 'Due Date', 'Status'].map((h) => (
                      <th key={h} style={{
                        padding: '0.75rem 1.25rem',
                        textAlign: 'left',
                        color: '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((item, idx) => {
                    const isDone = item.status === 'DONE';
                    const isToggling = togglingId === item.id;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: idx < actionItems.length - 1
                            ? '1px solid rgba(99,102,241,0.07)'
                            : 'none',
                          transition: 'background 0.15s',
                          background: isDone ? 'rgba(52,211,153,0.04)' : 'transparent',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isDone ? 'rgba(52,211,153,0.07)' : 'rgba(99,102,241,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isDone ? 'rgba(52,211,153,0.04)' : 'transparent')}
                      >
                        {/* Task */}
                        <td style={{ padding: '0.875rem 1.25rem', color: isDone ? '#6b7280' : '#e2e4ef', textDecoration: isDone ? 'line-through' : 'none', maxWidth: '18rem' }}>
                          {item.text}
                        </td>
                        {/* Owner */}
                        <td style={{ padding: '0.875rem 1.25rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: 'rgba(99,102,241,0.1)',
                            color: '#a5b4fc',
                            borderRadius: '0.35rem',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}>
                            {item.owner}
                          </span>
                        </td>
                        {/* Due Date */}
                        <td style={{ padding: '0.875rem 1.25rem', color: item.dueDate ? '#d1d5db' : '#4b5563', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {item.dueDate ?? '—'}
                        </td>
                        {/* Status toggle */}
                        <td style={{ padding: '0.875rem 1.25rem' }}>
                          <button
                            id={`toggle-action-item-${item.id}`}
                            onClick={() => handleToggleStatus(item)}
                            disabled={isToggling}
                            title={isDone ? 'Mark as Pending' : 'Mark as Done'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '0.4rem',
                              border: `1px solid ${isDone ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.25)'}`,
                              background: isDone ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.1)',
                              color: isDone ? '#34d399' : '#818cf8',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              cursor: isToggling ? 'wait' : 'pointer',
                              transition: 'all 0.15s',
                              opacity: isToggling ? 0.6 : 1,
                            }}
                          >
                            {isToggling ? (
                              <Spinner />
                            ) : isDone ? (
                              <CheckIcon size={13} />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                              </svg>
                            )}
                            {isDone ? 'Done' : 'Pending'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Transcript card ──────────────────────────────────────────── */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <SectionHeading
            label="Transcript"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
          />

          {/* Duration badge */}
          {durationLabel && (
            <div style={{ padding: '0.5rem 1.5rem 0', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{
                background: 'rgba(99,102,241,0.12)',
                color: '#818cf8',
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 9999,
                fontWeight: 600,
              }}>
                {durationLabel}
              </span>
            </div>
          )}

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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

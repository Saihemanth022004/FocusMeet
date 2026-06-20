import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

interface Meeting {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  createdAt: string;
  duration: number | null;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Meeting }>(`/api/meetings/${id}`)
      .then(res => setMeeting(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--color-surface-900)', color: '#6b7280' }}>
        Loading meeting…
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
           style={{ background: 'var(--color-surface-900)' }}>
        <p style={{ color: '#6b7280' }}>Meeting not found.</p>
        <Link to="/" className="btn-primary mt-4">Go to dashboard</Link>
      </div>
    );
  }

  const statusConfig = {
    SCHEDULED: { label: 'Scheduled', cls: 'badge-scheduled' },
    LIVE:      { label: 'Live',      cls: 'badge-live'      },
    COMPLETED: { label: 'Completed', cls: 'badge-completed' },
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4"
           style={{ background: 'rgba(13,14,20,0.9)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <Link to="/" style={{ color: '#6b7280', fontSize: '0.875rem' }}>← Dashboard</Link>
        <span style={{ color: '#3d4066' }}>|</span>
        <span className="font-semibold" style={{ color: '#e2e4ef' }}>{meeting.title}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        {/* Meeting header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{meeting.title}</h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {new Date(meeting.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
                {meeting.duration ? ` · ${Math.floor(meeting.duration / 60)}m ${meeting.duration % 60}s` : ''}
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

        {/* Placeholder sections */}
        {['Transcript', 'Summary', 'Action Items'].map(section => (
          <div key={section} className="glass-card p-6 mb-4">
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#9ca3af' }}>
              {section.toUpperCase()}
            </h2>
            {meeting.status === 'COMPLETED' ? (
              <p style={{ color: '#4b5563' }}>
                {section} content will appear here once the AI has processed the recording.
              </p>
            ) : (
              <p style={{ color: '#4b5563' }}>
                Available after the meeting is completed.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

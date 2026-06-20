import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface Meeting {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  createdAt: string;
  duration: number | null;
}

export default function DashboardPage() {
  const navigate   = useNavigate();
  const user       = JSON.parse(localStorage.getItem('fm_user') || '{}');
  const [meetings, setMeetings]     = useState<Meeting[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => {
    api.get<{ data: Meeting[] }>('/api/meetings')
      .then(res => setMeetings(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function createMeeting() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post<{ data: Meeting }>('/api/meetings', { title: newTitle });
      setMeetings(prev => [data.data, ...prev]);
      setShowModal(false);
      setNewTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  function signOut() {
    localStorage.removeItem('fm_token');
    localStorage.removeItem('fm_user');
    navigate('/login');
  }

  const statusConfig = {
    SCHEDULED: { label: 'Scheduled', cls: 'badge-scheduled' },
    LIVE:      { label: 'Live',      cls: 'badge-live'      },
    COMPLETED: { label: 'Completed', cls: 'badge-completed' },
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>

      {/* Top nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
           style={{ background: 'rgba(13,14,20,0.8)', backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,var(--color-brand-600),var(--color-accent-600))' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)', color: '#f1f2fa' }}>
            FocusMeet
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link id="nav-search" to="/search" className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </Link>
          <button id="nav-signout" onClick={signOut} className="text-sm"
                  style={{ color: '#6b7280', cursor: 'pointer', background: 'none', border: 'none' }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Hero header */}
      <div className="px-6 pt-10 pb-6 max-w-5xl mx-auto">
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Good {getGreeting()}, {user.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: '#6b7280' }}>Here are your recent meetings.</p>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 max-w-5xl mx-auto flex items-center justify-between">
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
        </p>
        <button id="create-meeting-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New meeting
        </button>
      </div>

      {/* Meetings grid */}
      <div className="px-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-20" style={{ color: '#6b7280' }}>Loading meetings…</div>
        ) : meetings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">🎙️</div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No meetings yet</h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Create your first meeting and start transcribing with AI.
            </p>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Create first meeting
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
            {meetings.map((m, i) => (
              <Link
                key={m.id}
                to={`/meetings/${m.id}`}
                id={`meeting-card-${i}`}
                className="glass-card p-5 block animate-fade-in"
                style={{
                  animationDelay: `${i * 60}ms`,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  textDecoration: 'none', color: 'inherit',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(99,102,241,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`badge ${statusConfig[m.status].cls}`}>
                    {m.status === 'LIVE' && <span className="live-dot" />}
                    {statusConfig[m.status].label}
                  </span>
                  {m.duration && (
                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      {formatDuration(m.duration)}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#e2e4ef' }}>
                  {m.title}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {new Date(m.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create meeting modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={() => setShowModal(false)}>
          <div className="glass-card p-6 w-full max-w-sm mx-4 animate-fade-in"
               onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>New meeting</h2>
            <input
              id="new-meeting-title"
              type="text"
              className="fm-input"
              placeholder="Meeting title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createMeeting()}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button id="confirm-create-meeting" className="btn-primary flex-1"
                      onClick={createMeeting} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

interface SearchResult {
  meetingId: string;
  meetingTitle: string;
  excerpt: string;
  score: number;
  createdAt: string;
}

export default function SearchPage() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get<{ data: SearchResult[] }>('/api/search', {
        params: { q: query, limit: 10 },
        baseURL: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000',
      });
      setResults(data.data ?? []);
    } catch {
      // AI service not yet implemented — show empty state
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-900)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4"
           style={{ background: 'rgba(13,14,20,0.9)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
        <Link to="/" style={{ color: '#6b7280', fontSize: '0.875rem' }}>← Dashboard</Link>
        <span style={{ color: '#3d4066' }}>|</span>
        <span className="font-semibold" style={{ color: '#e2e4ef' }}>Search Meetings</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        {/* Search header */}
        <div className="text-center mb-10">
          <h1 className="gradient-text" style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>
            Search across meetings
          </h1>
          <p style={{ color: '#6b7280' }}>
            Use natural language to find anything discussed in your meetings.
          </p>
        </div>

        {/* Search bar */}
        <form id="search-form" onSubmit={handleSearch} className="flex gap-3 mb-10">
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                 style={{ color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search-input"
              type="text"
              className="fm-input"
              style={{ paddingLeft: '2.75rem' }}
              placeholder='e.g. "What were the Q3 budget decisions?"'
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button id="search-submit" type="submit" className="btn-primary" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {/* Results */}
        {loading && (
          <div className="text-center py-10" style={{ color: '#6b7280' }}>
            Searching with AI…
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="glass-card p-10 text-center">
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</p>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No results found</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              The AI search service will be available once the AI service is running.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            {results.map((r, i) => (
              <Link
                key={i}
                to={`/meetings/${r.meetingId}`}
                id={`search-result-${i}`}
                className="glass-card p-5 block animate-fade-in"
                style={{
                  animationDelay: `${i * 60}ms`, textDecoration: 'none', color: 'inherit',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e4ef' }}>
                    {r.meetingTitle}
                  </h2>
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Score: {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {r.excerpt}
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

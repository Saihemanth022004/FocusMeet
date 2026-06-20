import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password });
      localStorage.setItem('fm_token', data.data.token);
      localStorage.setItem('fm_user', JSON.stringify(data.data));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
         style={{ background: 'var(--color-surface-900)' }}>

      {/* Background orbs */}
      <div className="orb w-96 h-96 top-[-80px] right-[-80px]"
           style={{ background: 'var(--color-accent-600)' }} />
      <div className="orb w-72 h-72 bottom-[-60px] left-[-60px]"
           style={{ background: 'var(--color-brand-700)', animationDelay: '4s' }} />

      {/* Card */}
      <div className="glass-card animate-fade-in w-full max-w-md mx-4 p-8 relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style={{ background: 'linear-gradient(135deg, var(--color-brand-600), var(--color-accent-600))' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem' }}>Create your account</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Start transcribing meetings with AI
          </p>
        </div>

        {/* Form */}
        <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm"
                 style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="register-name" className="block text-sm font-medium mb-1.5"
                   style={{ color: '#9ca3af' }}>
              Full name
            </label>
            <input
              id="register-name"
              type="text"
              className="fm-input"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-medium mb-1.5"
                   style={{ color: '#9ca3af' }}>
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              className="fm-input"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-sm font-medium mb-1.5"
                   style={{ color: '#9ca3af' }}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              className="fm-input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button id="register-submit" type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold" style={{ color: 'var(--color-brand-400)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

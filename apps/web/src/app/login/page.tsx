'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('alex@apexweb.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate session
      await new Promise((res) => setTimeout(res, 400));
      if (!email.trim() || !password.trim()) {
        setError('Please enter your work email and password.');
        setLoading(false);
        return;
      }

      // Store authenticated session
      if (typeof window !== 'undefined') {
        localStorage.setItem('siteguard_user', JSON.stringify({
          email: email.trim(),
          name: email.includes('alex') || email.includes('salman') ? 'Salmanul Faris' : 'Agency Operator',
          role: 'owner',
          organizationId: 'apex-web',
          organizationName: 'Apex Web Studio',
        }));
      }

      router.push('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('alex@apexweb.com');
    setPassword('SiteGuard2026!');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <img
            src="/branding/logo-dark-transparent.png"
            alt="SiteReliant - Detect Diagnose Verify"
            style={{ height: '42px', width: 'auto', display: 'block' }}
          />
        </Link>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your agency operations workspace</p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginBottom: '16px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={fillDemo}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '12px', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
          >
            ⚡ Quick-Fill Demo Account (Salmanul Faris · Apex Web Studio)
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/register">Create account</Link>
        </div>
      </div>
    </div>
  );
}

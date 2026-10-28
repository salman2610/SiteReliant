'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((res) => setTimeout(res, 500));
    setLoading(false);
    setSubmitted(true);
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

        <h1 className="auth-title">Reset password</h1>
        <p className="auth-subtitle">
          {submitted
            ? 'Recovery instructions sent!'
            : 'Enter your agency email and we will send a password reset link.'}
        </p>

        {submitted ? (
          <div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '14px', borderRadius: '10px', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
            </div>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Work email</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginBottom: '16px' }}
              disabled={loading}
            >
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remembered your password?{' '}
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

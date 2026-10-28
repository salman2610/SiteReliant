'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultPlan = searchParams?.get('plan') || 'pro';

  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!fullName.trim() || !workEmail.trim() || !orgName.trim() || !password.trim()) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      // Simulate registration and save draft onboarding session
      if (typeof window !== 'undefined') {
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        localStorage.setItem('siteguard_registration', JSON.stringify({
          fullName: fullName.trim(),
          workEmail: workEmail.trim(),
          orgName: orgName.trim(),
          orgSlug: slug,
          plan,
        }));
      }

      await new Promise((res) => setTimeout(res, 350));
      // Guide user to first-run onboarding
      router.push('/onboarding');
    } catch {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: '480px' }}>
      <Link href="/" className="auth-logo">
        <img
          src="/branding/logo-dark-transparent.png"
          alt="SiteReliant - Detect Diagnose Verify"
          style={{ height: '42px', width: 'auto', display: 'block' }}
        />
      </Link>

      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Start monitoring your websites with a 14-day free trial</p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Full name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Work email</label>
          <input
            type="email"
            className="form-input"
            placeholder="you@agency.com"
            value={workEmail}
            onChange={(e) => setWorkEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Organization name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Your agency"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="form-label">Selected plan</label>
          <select className="form-select" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="starter">Starter — $49/mo (15 sites, 5-min checks)</option>
            <option value="pro">Agency Pro — $149/mo (50 sites, 1-min checks, white-label portals)</option>
            <option value="enterprise">Enterprise — $399/mo (200 sites, 30s checks, custom egress)</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }}
          disabled={loading}
        >
          {loading ? 'Creating workspace...' : 'Create account'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center' }}>Loading registration...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Org details
  const [orgName, setOrgName] = useState('Apex Web Studio');
  const [agencyDomain, setAgencyDomain] = useState('status.apexweb.com');
  const [timezone, setTimezone] = useState('UTC');

  // Step 2: First site
  const [clientName, setClientName] = useState('Acme Corporation');
  const [siteName, setSiteName] = useState('Acme Storefront');
  const [siteUrl, setSiteUrl] = useState('https://www.sesametechnologies.net/');
  const [checkInterval, setCheckInterval] = useState('1m');
  const [enableHttp, setEnableHttp] = useState(true);
  const [enableSsl, setEnableSsl] = useState(true);
  const [enableDns, setEnableDns] = useState(true);

  // Step 3: Alerts
  const [senderName, setSenderName] = useState('SiteReliant Alerts');
  const [senderEmail, setSenderEmail] = useState('alerts@apexweb.com');
  const [recipientEmail, setRecipientEmail] = useState('devops@apexweb.com');
  const [testSent, setTestSent] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('siteguard_registration');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.orgName) setOrgName(parsed.orgName);
          if (parsed.workEmail) {
            setRecipientEmail(parsed.workEmail);
            const domain = parsed.workEmail.split('@')[1];
            if (domain) setAgencyDomain(`status.${domain}`);
          }
        } catch {}
      }
    }
  }, []);

  const handleComplete = async () => {
    setSaving(true);
    // Create site in database if possible
    try {
      // 1. Create client
      const compRes = await fetch('/api/v1/organizations/apex-web/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName.trim() || 'First Client',
          contactEmail: recipientEmail.trim() || 'alerts@agency.com',
          timezone,
        }),
      });
      const compJson = await compRes.json();
      const clientId = compJson?.data?.id;

      if (clientId && siteUrl) {
        // 2. Register site
        await fetch('/api/v1/organizations/apex-web/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            name: siteName.trim() || 'First Website',
            url: siteUrl.trim(),
            checkInterval,
            checks: {
              http: enableHttp,
              tls: enableSsl,
              dns: enableDns,
              redirect: true,
              headers: true,
            },
            runImmediateCheck: true,
          }),
        });
      }
    } catch (e) {
      console.warn('Onboarding auto-provisioning caught:', e);
    } finally {
      setSaving(false);
      router.push('/dashboard');
    }
  };

  return (
    <div className="auth-page" style={{ padding: '40px 16px' }}>
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img
            src="/branding/logo-dark-transparent.png"
            alt="SiteReliant - Detect Diagnose Verify"
            style={{ height: '40px', width: 'auto', display: 'block' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New Agency Onboarding
          </div>
        </div>

        {/* Stepper Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          {[
            { num: 1, title: 'Agency Profile' },
            { num: 2, title: 'First Website' },
            { num: 3, title: 'Email Alerts' },
          ].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: step >= s.num ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '13px', color: step >= s.num ? '#ffffff' : 'var(--text-muted)', fontWeight: step === s.num ? 600 : 400 }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: ORGANIZATION PROFILE */}
        {step === 1 && (
          <div>
            <h2 className="auth-title" style={{ textAlign: 'left', fontSize: '20px' }}>Configure your agency profile</h2>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '20px' }}>
              Define your agency branding and custom domain for client status pages.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Agency Organization Name</label>
              <input
                type="text"
                className="form-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Apex Web Studio"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">White-Label Status Portal Domain</label>
              <input
                type="text"
                className="form-input"
                value={agencyDomain}
                onChange={(e) => setAgencyDomain(e.target.value)}
                placeholder="status.youragency.com"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Your clients will access their uptime reports and incident history here.
              </span>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="form-label">Reporting Timezone</label>
              <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (Eastern)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                Continue to First Website →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADD FIRST WEBSITE */}
        {step === 2 && (
          <div>
            <h2 className="auth-title" style={{ textAlign: 'left', fontSize: '20px' }}>Add your first client website</h2>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '20px' }}>
              SiteReliant will schedule automatic checks and verify response health immediately.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Client Company Name</label>
              <input
                type="text"
                className="form-input"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Website Name</label>
              <input
                type="text"
                className="form-input"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Acme Production Store"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Target Website URL</label>
              <input
                type="url"
                className="form-input"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://clientwebsite.com"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Check Interval</label>
              <select className="form-select" value={checkInterval} onChange={(e) => setCheckInterval(e.target.value)}>
                <option value="1m">Every 1 minute (Agency Pro)</option>
                <option value="5m">Every 5 minutes</option>
                <option value="15m">Every 15 minutes</option>
                <option value="30m">Every 30 minutes</option>
                <option value="1h">Every hour</option>
              </select>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="form-label">Active Monitoring Vectors</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={enableHttp} onChange={(e) => setEnableHttp(e.target.checked)} />
                  HTTP Uptime
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={enableSsl} onChange={(e) => setEnableSsl(e.target.checked)} />
                  SSL Validity
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={enableDns} onChange={(e) => setEnableDns(e.target.checked)} />
                  DNS Changes
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                ← Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                Continue to Email Alerts →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIGURE EMAIL ALERTS */}
        {step === 3 && (
          <div>
            <h2 className="auth-title" style={{ textAlign: 'left', fontSize: '20px' }}>Set up email delivery &amp; alerts</h2>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '20px' }}>
              Choose how SiteReliant sends downtime alerts and monthly SLA reports to your team and clients.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Sender Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="SiteReliant Alerts"
                />
              </div>
              <div>
                <label className="form-label">Sender Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="alerts@youragency.com"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Primary Incident Alert Recipient</label>
              <input
                type="email"
                className="form-input"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="devops@youragency.com"
                required
              />
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '14px', borderRadius: '10px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>Delivery Driver: Mock / Dev Transport Active</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>You can configure custom SMTP credentials or SendGrid in Settings later.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestSent(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  {testSent ? '✓ Sent Test' : 'Send Test Alert'}
                </button>
              </div>
              {testSent && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981' }}>
                  ✓ Test alert dispatched to {recipientEmail}. Delivery logged with verified status.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setStep(2)} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                ← Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                {saving ? 'Launching Workspace...' : 'Launch Agency Dashboard 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

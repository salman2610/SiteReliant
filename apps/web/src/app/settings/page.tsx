'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface AlertPolicy {
  id: string;
  eventType: string;
  channel: string;
  recipient: string;
  enabled: boolean;
}

interface NotificationDeliveryItem {
  id: string;
  recipient: string;
  eventKey: string;
  status: 'sent' | 'failed' | 'pending';
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  incident?: {
    title: string;
    severity: string;
    site?: { name: string; url: string };
  };
}

interface BrandingSettings {
  name: string;
  brandLogoUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  customDomain: string;
  supportEmail: string;
  portalHeading: string;
  portalSubheading: string;
}

interface EmailSettings {
  provider: 'smtp' | 'sendgrid' | 'postmark' | 'ses' | 'mock';
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'tls' | 'ssl' | 'none';
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  smtpUsername: string;
  smtpPassword?: string;
  hasPassword?: boolean;
  maskedPassword?: string;
  apiKey?: string;
  hasApiKey?: boolean;
  maskedApiKey?: string;
  status: 'untested' | 'verified' | 'error';
  lastTestedAt: string | null;
  lastError: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'notifications' | 'branding' | 'team'>('email');

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpEncryption: 'tls',
    senderName: 'SiteReliant Alerts',
    senderEmail: 'alerts@apexweb.com',
    replyToEmail: 'support@apexweb.com',
    smtpUsername: '',
    smtpPassword: '',
    status: 'untested',
    lastTestedAt: null,
    lastError: null,
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('ops@apexweb.com');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Notification Rules & Delivery Log State
  const [alertPolicies, setAlertPolicies] = useState<AlertPolicy[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDeliveryItem[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [newEventType, setNewEventType] = useState('website_down_recovered');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Branding State
  const [branding, setBranding] = useState<BrandingSettings>({
    name: 'Apex Web Studio',
    brandLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    brandPrimaryColor: '#0ea5e9',
    brandAccentColor: '#6366f1',
    customDomain: 'status.apexweb.com',
    supportEmail: 'support@apexweb.com',
    portalHeading: 'Client Service Reliability Portal',
    portalSubheading: 'Real-time uptime, SLA performance, and verified incident remediations powered by Apex Web Studio.',
  });
  const [savingBranding, setSavingBranding] = useState(false);

  // Team State
  const [members, setMembers] = useState<Member[]>([]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const orgId = 'apex-web';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = async () => {
    try {
      const [emailRes, polRes, brandRes, memRes, delRes] = await Promise.all([
        fetch(`/api/v1/organizations/${orgId}/email-settings`),
        fetch(`/api/v1/organizations/${orgId}/alert-policies`),
        fetch(`/api/v1/organizations/${orgId}/branding`),
        fetch(`/api/v1/organizations/${orgId}/members`),
        fetch(`/api/v1/organizations/${orgId}/notification-deliveries`),
      ]);

      const emailJson = await emailRes.json();
      const polJson = await polRes.json();
      const brandJson = await brandRes.json();
      const memJson = await memRes.json();
      const delJson = await delRes.json();

      if (emailJson.data) {
        setEmailSettings((prev) => ({
          ...prev,
          ...emailJson.data,
          smtpPassword: emailJson.data.hasPassword ? '••••••••••••' : '',
        }));
      }
      if (polJson.data) setAlertPolicies(polJson.data);
      if (brandJson.data) {
        setBranding({
          name: brandJson.data.name || '',
          brandLogoUrl: brandJson.data.brandLogoUrl || '',
          brandPrimaryColor: brandJson.data.brandPrimaryColor || '#0ea5e9',
          brandAccentColor: brandJson.data.brandAccentColor || '#6366f1',
          customDomain: brandJson.data.customDomain || '',
          supportEmail: brandJson.data.supportEmail || '',
          portalHeading: brandJson.data.portalHeading || '',
          portalSubheading: brandJson.data.portalSubheading || '',
        });
      }
      if (memJson.data) setMembers(memJson.data);
      if (delJson.data) setDeliveries(delJson.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/email-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings),
      });

      const json = await res.json();
      if (res.ok) {
        showToast('Email delivery and SMTP credentials securely saved & encrypted (AES-256-GCM).');
        fetchData();
      } else {
        showToast(json.error?.message || 'Failed to save email settings', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error saving email settings', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/email-settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testRecipient }),
      });

      const json = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: `✓ Connection verified! Test email successfully sent in ${json.data?.latencyMs || 25}ms (ID: ${json.data?.messageId})`,
        });
        showToast(`Test email sent to ${testRecipient}`);
        fetchData();
      } else {
        setTestResult({
          success: false,
          message: `✗ ${json.error?.message || 'Connection test failed'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `✗ Network error: ${err.message}`,
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleAddAlertRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim()) return;
    setAddingRecipient(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/alert-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: newEventType,
          channel: 'email',
          recipient: newRecipient.trim(),
          enabled: true,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast(`Alert policy created for ${newRecipient}`);
        setNewRecipient('');
        fetchData();
      } else {
        showToast(json.error?.message || 'Failed to add recipient', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleDeleteAlertPolicy = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/alert-policies/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Recipient alert policy removed.');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });

      const json = await res.json();
      if (res.ok) {
        showToast('Agency white-label branding saved and deployed across client portals!');
      } else {
        showToast(json.error?.message || 'Failed to update branding', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '14px 20px',
            borderRadius: '10px',
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(244, 63, 94, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="top-bar">
        <div>
          <h1 className="page-title">Settings & Operational Controls</h1>
          <p className="page-subtitle">
            Configure SMTP delivery, event notification rules, white-label client portals, and agency access
          </p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="tabs-nav" style={{ marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          ✉ Email Delivery & SMTP
        </button>
        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notification Rules & Delivery Logs
        </button>
        <button
          className={`tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          🎨 White-Label Branding
        </button>
        <button
          className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          👥 Team Access ({members.length})
        </button>
      </div>

      {/* ========================================================
          TAB 1: Email Delivery & SMTP Settings
         ======================================================== */}
      {activeTab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Connection Status Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>
                  SMTP Connection Status:
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background:
                      emailSettings.status === 'verified'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : emailSettings.status === 'error'
                        ? 'rgba(244, 63, 94, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      emailSettings.status === 'verified'
                        ? '#34d399'
                        : emailSettings.status === 'error'
                        ? '#fb7185'
                        : '#94a3b8',
                    border: `1px solid ${
                      emailSettings.status === 'verified'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : emailSettings.status === 'error'
                        ? 'rgba(244, 63, 94, 0.3)'
                        : 'rgba(148, 163, 184, 0.3)'
                    }`,
                  }}
                >
                  ● {emailSettings.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {emailSettings.lastTestedAt
                  ? `Last verified: ${new Date(emailSettings.lastTestedAt).toLocaleString()}`
                  : 'No test email has been sent yet.'}
                {emailSettings.lastError && (
                  <span style={{ color: '#fb7185', marginLeft: '8px' }}>
                    Error: {emailSettings.lastError}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTestEmailModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Test Connection & Send Email
            </button>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSaveEmailSettings} className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
              SMTP & Transactional Provider Configuration
            </h2>

            {/* Provider Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Email Service Driver</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '6px' }}>
                {[
                  { id: 'smtp', label: 'Custom SMTP Server' },
                  { id: 'sendgrid', label: 'SendGrid API' },
                  { id: 'postmark', label: 'Postmark' },
                  { id: 'ses', label: 'AWS SES' },
                  { id: 'mock', label: 'Mock / Dev Engine' },
                ].map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: emailSettings.provider === p.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: emailSettings.provider === p.id ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: emailSettings.provider === p.id ? '#38bdf8' : 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="emailProvider"
                      checked={emailSettings.provider === p.id}
                      onChange={() => setEmailSettings({ ...emailSettings, provider: p.id as any })}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* SMTP Host, Port, Encryption */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label className="form-label">SMTP Host / Server</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. smtp.postmarkapp.com or smtp.sendgrid.net"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">SMTP Port</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="587"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value, 10) || 587 })}
                />
              </div>

              <div>
                <label className="form-label">Encryption Protocol</label>
                <select
                  className="form-select"
                  value={emailSettings.smtpEncryption}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpEncryption: e.target.value as any })}
                >
                  <option value="tls">STARTTLS (Port 587 / 25)</option>
                  <option value="ssl">SSL / TLS (Port 465)</option>
                  <option value="none">None (Plaintext)</option>
                </select>
              </div>
            </div>

            {/* Sender Name, Email, Reply-To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label className="form-label">Sender Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Operations Vigilance"
                  value={emailSettings.senderName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Sender Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="alerts@youragency.com"
                  value={emailSettings.senderEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, senderEmail: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Reply-To Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="support@youragency.com"
                  value={emailSettings.replyToEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, replyToEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Username & Password (Encrypted & Masked) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label className="form-label">SMTP Username / Account ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="apikey or user@agency.com"
                  value={emailSettings.smtpUsername}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpUsername: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">
                  Password / App-Specific Password / API Key
                  {emailSettings.hasPassword && (
                    <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '6px' }}>
                      (Encrypted on server)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={emailSettings.hasPassword ? '•••••••••••• (Leave unchanged or enter new)' : 'Enter password or API key'}
                  value={emailSettings.smtpPassword || ''}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Stored encrypted with AES-256-GCM. Never exposed in frontend, never written to server logs.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTestEmailModal(true)}
              >
                Test Connection
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingEmail}>
                {savingEmail ? 'Encrypting & Saving...' : 'Save Email Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 2: Notification Rules & Delivery Logs
         ======================================================== */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notification Event Matrix */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Notification Event Rules
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Configure which operational events generate high-priority email alerts to your engineering team
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { title: 'Website Down & Recovered', desc: 'Alerts when HTTP check fails consecutive thresholds and when operational recovery is confirmed.' },
                { title: 'SSL Expiring or Expired', desc: 'Triggers proactive alerts 14 days and 3 days before certificate expiry, or on TLS handshake failure.' },
                { title: 'DNS & Security Header Changes', desc: 'Notifies when DNS records differ from baseline or critical security headers are stripped.' },
                { title: 'Browser Workflow Failure', desc: 'Immediate incident dispatched when synthetic contact form, checkout, or login journey fails.' },
                { title: 'Remediation Verification', desc: 'Broadcasts verified proof evidence when an engineer executes a fix and MTTR is measured.' },
                { title: 'Scheduled Report Delivery', desc: 'Dispatches white-labeled monthly availability & SLA reports to client contacts.' },
              ].map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    <span style={{ color: '#10b981' }}>✓</span>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {ev.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Alert Recipient Form */}
            <form onSubmit={handleAddAlertRecipient} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
              <div style={{ flex: 2, minWidth: '220px' }}>
                <label className="form-label">Alert Recipient Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. devops@youragency.com"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: 2, minWidth: '220px' }}>
                <label className="form-label">Subscribed Event Trigger</label>
                <select
                  className="form-select"
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                >
                  <option value="website_down_recovered">Website Down & Recovered</option>
                  <option value="ssl_expiring_expired">SSL Certificate Warnings</option>
                  <option value="dns_header_changes">DNS & Security Header Changes</option>
                  <option value="browser_workflow_failure">Browser Synthetic Journey Failures</option>
                  <option value="remediation_verification">Remediation Verification Proof</option>
                  <option value="all">All Operational Events</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={addingRecipient} style={{ height: '42px' }}>
                {addingRecipient ? 'Adding...' : '+ Add Alert Recipient'}
              </button>
            </form>

            {/* Active Alert Recipients Table */}
            <div className="table-container" style={{ marginTop: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient Email</th>
                    <th>Channel</th>
                    <th>Subscribed Events</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alertPolicies.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.recipient}</td>
                      <td>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>
                          {p.channel}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <code>{p.eventType}</code>
                      </td>
                      <td>
                        <span className="status-badge healthy" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          ACTIVE
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteAlertPolicy(p.id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11px', color: '#fb7185' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {alertPolicies.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No dedicated alert recipients configured. Defaulting to agency operator email.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Audit Log Card */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email Delivery Logs & Retries
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Full audit trail of dispatched alert transmissions, delivery timestamps, attempt counts, and provider responses
            </p>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Recipient</th>
                    <th>Associated Incident</th>
                    <th>Delivery Status</th>
                    <th>Attempts</th>
                    <th>Provider Message / Error Trace</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((del) => (
                    <tr key={del.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(del.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {del.recipient}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {del.incident?.title || 'System Notification'}
                        </div>
                        {del.incident?.site && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {del.incident.site.name} ({del.incident.site.url})
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${del.status === 'sent' ? 'healthy' : del.status === 'failed' ? 'down' : 'pending'}`}
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          {del.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {del.attemptCount}
                      </td>
                      <td style={{ fontSize: '12px', color: del.lastError ? '#fb7185' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {del.lastError ? del.lastError : del.sentAt ? `Delivered at ${new Date(del.sentAt).toLocaleTimeString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No delivery logs recorded yet. Dispatches will appear here automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: White-Label Branding (Existing)
         ======================================================== */}
      {activeTab === 'branding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Visual Header Preview */}
          <div className="glass-card" style={{ borderLeft: `4px solid ${branding.brandPrimaryColor}` }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Live Client Portal Header Preview
            </h3>
            <div style={{ background: 'rgba(7, 9, 14, 0.6)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {branding.brandLogoUrl && (
                  <img src={branding.brandLogoUrl} alt="Logo Preview" style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{branding.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{branding.portalSubheading}</div>
                </div>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: '6px', background: branding.brandPrimaryColor, color: '#fff', fontWeight: 600, fontSize: '12px' }}>
                Contact Agency
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBranding} className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
              Agency White-Label Customization
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="form-label">Agency Brand Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={branding.name}
                  onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label">Brand Logo URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={branding.brandLogoUrl}
                  onChange={(e) => setBranding({ ...branding, brandLogoUrl: e.target.value })}
                  placeholder="https://agency.com/logo.png"
                />
              </div>

              <div>
                <label className="form-label">Primary Brand Color (Hex)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="color"
                    value={branding.brandPrimaryColor}
                    onChange={(e) => setBranding({ ...branding, brandPrimaryColor: e.target.value })}
                    style={{ width: '42px', height: '42px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={branding.brandPrimaryColor}
                    onChange={(e) => setBranding({ ...branding, brandPrimaryColor: e.target.value })}
                    pattern="^#[0-9a-fA-F]{6}$"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Accent Brand Color (Hex)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="color"
                    value={branding.brandAccentColor}
                    onChange={(e) => setBranding({ ...branding, brandAccentColor: e.target.value })}
                    style={{ width: '42px', height: '42px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={branding.brandAccentColor}
                    onChange={(e) => setBranding({ ...branding, brandAccentColor: e.target.value })}
                    pattern="^#[0-9a-fA-F]{6}$"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Custom Domain Host</label>
                <input
                  type="text"
                  className="form-input"
                  value={branding.customDomain}
                  onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                  placeholder="status.youragency.com"
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Point your CNAME record to: <code>cname.siteguard.io</code>
                </span>
              </div>

              <div>
                <label className="form-label">Agency Support Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={branding.supportEmail}
                  onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                  placeholder="support@agency.com"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label className="form-label">Client Portal Title Heading</label>
                <input
                  type="text"
                  className="form-input"
                  value={branding.portalHeading}
                  onChange={(e) => setBranding({ ...branding, portalHeading: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Client Portal Subheading</label>
                <input
                  type="text"
                  className="form-input"
                  value={branding.portalSubheading}
                  onChange={(e) => setBranding({ ...branding, portalSubheading: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingBranding}>
              {savingBranding ? 'Saving...' : 'Save & Deploy White-Label Branding'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 4: Team Members (Existing)
         ======================================================== */}
      {activeTab === 'team' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Agency Team Access</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Operators and administrators with access to this monitoring portfolio
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                    <td style={{ color: 'var(--accent-blue)', fontSize: '13px' }}>{m.email}</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '11px' }}>
                        {m.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestEmailModal && (
        <div className="modal-overlay" onClick={() => setShowTestEmailModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Test Email Connection
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Verify SMTP handshake and send a live test message
                </p>
              </div>
              <button
                onClick={() => setShowTestEmailModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                  color: testResult.success ? '#34d399' : '#fb7185',
                }}
              >
                {testResult.message}
              </div>
            )}

            <form onSubmit={handleSendTestEmail}>
              <div className="form-group">
                <label className="form-label">Send Test Email To *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. your-email@agency.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTestEmailModal(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={testingEmail}>
                  {testingEmail ? 'Testing & Sending...' : 'Dispatch Test Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SiteMonitorItem {
  id: string;
  name: string;
  url: string;
  normalizedHost: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  isActive: boolean;
  emailAlertMode: 'failure_recovery' | 'every_check' | 'none';
  intervalSeconds: number;
  client: { id: string; name: string };
  enabledChecks: string[];
  browserMonitorsCount: number;
  openIncidents: { id: string; title: string; severity: string }[];
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<SiteMonitorItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Add Monitor Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('existing');
  const [formClientId, setFormClientId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyEmail, setNewCompanyEmail] = useState<string>('');
  
  // Website Monitor Form Fields
  const [enabled, setEnabled] = useState<boolean>(true);
  const [siteName, setSiteName] = useState<string>('');
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [checkInterval, setCheckInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h'>('5m');
  const [checks, setChecks] = useState({
    http: true,
    tls: true,
    dns: false,
    securityHeaders: false,
    browser: true,
  });
  const [emailAlerts, setEmailAlerts] = useState<'failure_recovery' | 'every_check' | 'none'>('failure_recovery');
  const [runImmediate, setRunImmediate] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);

  const orgId = 'apex-web';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadMonitors = async () => {
    try {
      setLoading(true);
      const [sitesRes, clientsRes] = await Promise.all([
        fetch(`/api/v1/organizations/${orgId}/sites`),
        fetch(`/api/v1/organizations/${orgId}/clients`),
      ]);
      const sitesJson = await sitesRes.json();
      const clientsJson = await clientsRes.json();

      if (sitesJson.data) setMonitors(sitesJson.data);
      if (clientsJson.data) {
        setClients(clientsJson.data);
        if (clientsJson.data.length > 0 && !formClientId) {
          setFormClientId(clientsJson.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load monitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors();
  }, []);

  const handleToggleActive = async (site: SiteMonitorItem) => {
    const nextState = !site.isActive;
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      if (res.ok) {
        showToast(`Monitor '${site.name}' ${nextState ? 'enabled & resumed' : 'paused'}.`);
        loadMonitors();
      }
    } catch (err) {
      console.error('Failed to toggle monitor status:', err);
    }
  };

  const handleTestNow = async (site: SiteMonitorItem) => {
    setTestingSiteId(site.id);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sites/${site.id}/checks/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'http' }),
      });
      const ct = res.headers.get('content-type') || '';
      const json = ct.includes('application/json') ? await res.json() : { error: { message: await res.text() } };
      if (res.ok) {
        const pass = json.data?.success;
        showToast(
          `⚡ Probe completed for ${site.name}: ${pass ? 'HEALTHY (PASS)' : 'DOWN (FAIL)'} · ${json.data?.latencyMs}ms`,
          pass ? 'success' : 'error'
        );
        loadMonitors();
      } else {
        showToast(json.error?.message || 'Check failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setTestingSiteId(null);
    }
  };

  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      let targetClientId = formClientId;

      // 1. Create client company if in new mode
      if (companyMode === 'new') {
        if (!newCompanyName.trim()) {
          setFormError('Please enter a company name.');
          setSubmitting(false);
          return;
        }
        const compRes = await fetch(`/api/v1/organizations/${orgId}/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCompanyName.trim(),
            contactEmail: newCompanyEmail.trim() || 'alerts@agency.com',
            timezone: 'UTC',
          }),
        });
        const compJson = await compRes.json();
        if (!compRes.ok) {
          setFormError(compJson.error?.message || 'Failed to create client company.');
          setSubmitting(false);
          return;
        }
        targetClientId = compJson.data.id;
      }

      if (!targetClientId) {
        setFormError('Please select or create a client company.');
        setSubmitting(false);
        return;
      }

      // 2. Register monitor with configured interval and check capabilities
      const res = await fetch(`/api/v1/organizations/${orgId}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetClientId,
          name: siteName.trim(),
          url: siteUrl.trim(),
          checkInterval,
          emailAlertMode: emailAlerts,
          checks: {
            http: checks.http,
            tls: checks.tls,
            dns: checks.dns,
            redirects: true,
            securityHeaders: checks.securityHeaders,
            browser: checks.browser,
          },
          runImmediateCheck: runImmediate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.message || 'Failed to create monitor.');
        setSubmitting(false);
        return;
      }

      const initialStatus = json.data?.status || 'pending';
      showToast(
        `✅ Monitor created for ${siteName}! Automated schedule active (${checkInterval}). Status: ${initialStatus.toUpperCase()}`
      );

      setShowAddModal(false);
      setSiteName('');
      setSiteUrl('');
      setNewCompanyName('');
      setNewCompanyEmail('');
      setCompanyMode('existing');
      loadMonitors();
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatInterval = (sec: number) => {
    if (sec <= 60) return 'Every 1 minute';
    if (sec <= 300) return 'Every 5 minutes';
    if (sec <= 900) return 'Every 15 minutes';
    if (sec <= 1800) return 'Every 30 minutes';
    return 'Every 1 hour';
  };

  const formatAlertMode = (mode: string) => {
    if (mode === 'failure_recovery') return 'On failure & recovery';
    if (mode === 'every_check') return 'On every check result';
    return 'No email alerts';
  };

  const filtered = monitors.filter((m) => {
    if (selectedClientFilter === 'all') return true;
    return m.client?.id === selectedClientFilter;
  });

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
          <h1 className="page-title">Website URL Monitors</h1>
          <p className="page-subtitle">
            Configure automated background check schedules, active check vectors, and email alert policies
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadMonitors}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Add URL Monitor
          </button>
        </div>
      </div>

      {/* Monitors List Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Monitored URLs</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Background worker executes probes autonomously according to configured intervals
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filter Client:</span>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Monitor Status</th>
                <th>Website URL & Name</th>
                <th>Client Company</th>
                <th>Check Interval</th>
                <th>Active Vectors</th>
                <th>Email Alerts</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((site) => (
                <tr key={site.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleToggleActive(site)}
                        style={{
                          background: site.isActive ? '#10b981' : '#475569',
                          border: 'none',
                          borderRadius: '12px',
                          width: '36px',
                          height: '20px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        title={site.isActive ? 'Automated monitoring enabled' : 'Automated monitoring paused'}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: site.isActive ? '18px' : '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.2s',
                          }}
                        />
                      </button>
                      <span className={`status-badge ${site.status}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {site.status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Link href={`/sites/${site.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {site.name}
                      </Link>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      <a href={site.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {site.url} ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {site.client?.name || '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      ⏱ {formatInterval(site.intervalSeconds)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {site.enabledChecks.map((chk) => (
                        <span
                          key={chk}
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          {chk}
                        </span>
                      ))}
                      {site.browserMonitorsCount > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '4px',
                            color: '#c084fc',
                            fontWeight: 600,
                          }}
                        >
                          Browser (1)
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: site.emailAlertMode === 'none' ? '#64748b' : '#34d399' }}>
                      ✉ {formatAlertMode(site.emailAlertMode)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => handleTestNow(site)}
                        disabled={testingSiteId === site.id}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        title="Run immediate manual probe"
                      >
                        {testingSiteId === site.id ? '⚡ Testing...' : '⚡ Test Now'}
                      </button>
                      <Link
                        href={`/sites/${site.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Telemetry &rarr;
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No URL monitors configured yet. Click <strong>+ Add URL Monitor</strong> above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Monitor Modal (Matching the exact configuration in the user specification) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Website Monitor Settings
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Configure automatic check interval, check types, and notification rules
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: '#fb7185', fontSize: '13px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMonitor}>
              {/* Enabled toggle header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>Monitor Status</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enable automatic scheduled checking immediately</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  <strong style={{ color: enabled ? '#10b981' : 'var(--text-muted)', fontSize: '13px' }}>
                    {enabled ? 'Enabled' : 'Paused'}
                  </strong>
                </label>
              </div>

              {/* Company selection */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Client Company</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('existing')}
                    className={`btn ${companyMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                  >
                    Existing Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('new')}
                    className={`btn ${companyMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                  >
                    + Create New Company
                  </button>
                </div>

                {companyMode === 'existing' ? (
                  <select
                    className="form-select"
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <label className="form-label">Company Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Nordic E-Commerce"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Company Contact Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="ops@nordic.com"
                        value={newCompanyEmail}
                        onChange={(e) => setNewCompanyEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Website Display Name & Target URL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Website Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Marketing Storefront"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Website URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Check Interval */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Check interval</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginTop: '6px' }}>
                  {[
                    { id: '1m', label: 'Every 1 minute' },
                    { id: '5m', label: 'Every 5 minutes' },
                    { id: '15m', label: 'Every 15 minutes' },
                    { id: '30m', label: 'Every 30 minutes' },
                    { id: '1h', label: 'Every hour' },
                  ].map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: checkInterval === item.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)',
                        border: checkInterval === item.id ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: checkInterval === item.id ? '#38bdf8' : 'var(--text-secondary)',
                      }}
                    >
                      <input
                        type="radio"
                        name="checkInterval"
                        checked={checkInterval === item.id}
                        onChange={() => setCheckInterval(item.id as any)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Checks to Run */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Checks to run</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.http}
                      onChange={(e) => setChecks({ ...checks, http: e.target.checked })}
                    />
                    <span>HTTP uptime and response status</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.tls}
                      onChange={(e) => setChecks({ ...checks, tls: e.target.checked })}
                    />
                    <span>SSL certificate validity and expiry</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.dns}
                      onChange={(e) => setChecks({ ...checks, dns: e.target.checked })}
                    />
                    <span>DNS changes</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.securityHeaders}
                      onChange={(e) => setChecks({ ...checks, securityHeaders: e.target.checked })}
                    />
                    <span>Security headers</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.browser}
                      onChange={(e) => setChecks({ ...checks, browser: e.target.checked })}
                    />
                    <span>Browser and user-journey tests</span>
                  </label>
                </div>
              </div>

              {/* Email Alerts */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Email alerts</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {[
                    { id: 'failure_recovery', label: 'On confirmed failure and recovery' },
                    { id: 'every_check', label: 'On every check result' },
                    { id: 'none', label: 'No email alerts' },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: emailAlerts === mode.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="emailAlerts"
                        checked={emailAlerts === mode.id}
                        onChange={() => setEmailAlerts(mode.id as any)}
                      />
                      <span>{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Immediate Probe Option */}
              <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={runImmediate}
                    onChange={(e) => setRunImmediate(e.target.checked)}
                  />
                  <span>
                    <strong>⚡ Run immediate initial verification check</strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Validates URL egress, DNS resolution, and initial status upon saving
                    </span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Save & Start Monitoring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

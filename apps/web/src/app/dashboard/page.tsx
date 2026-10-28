'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OverviewMetrics {
  totalSites: number;
  healthySites: number;
  activeIncidents: number;
  certificatesExpiringSoon: number;
  overallHealthScore: number;
}

interface SiteItem {
  id: string;
  name: string;
  url: string;
  normalizedHost: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  client: { id: string; name: string };
  enabledChecks: string[];
  openIncidents: { id: string; title: string; severity: string }[];
  lastLatencyMs?: number;
}

interface ClientOption {
  id: string;
  name: string;
  slug?: string;
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalSites: 0,
    healthySites: 0,
    activeIncidents: 0,
    certificatesExpiringSoon: 0,
    overallHealthScore: 100,
  });
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddSiteModal, setShowAddSiteModal] = useState<boolean>(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState<boolean>(false);

  // Add Site Form State
  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('existing');
  const [formClientId, setFormClientId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyEmail, setNewCompanyEmail] = useState<string>('');
  const [formSiteName, setFormSiteName] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [runImmediate, setRunImmediate] = useState<boolean>(true);
  const [checks, setChecks] = useState({
    http: true,
    tls: true,
    dns: true,
    redirects: true,
    securityHeaders: true,
  });
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Standalone Company Form State
  const [standaloneCompanyName, setStandaloneCompanyName] = useState<string>('');
  const [standaloneCompanyEmail, setStandaloneCompanyEmail] = useState<string>('');
  const [companySubmitting, setCompanySubmitting] = useState<boolean>(false);
  const [companyError, setCompanyError] = useState<string>('');

  // Toast & Quick Check State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checkingSiteId, setCheckingSiteId] = useState<string | null>(null);

  const orgId = 'apex-web';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, sitesRes, clientsRes] = await Promise.all([
        fetch(`/api/v1/organizations/${orgId}/overview`),
        fetch(`/api/v1/organizations/${orgId}/sites`),
        fetch(`/api/v1/organizations/${orgId}/clients`),
      ]);

      const overviewJson = await overviewRes.json();
      const sitesJson = await sitesRes.json();
      const clientsJson = await clientsRes.json();

      if (overviewJson.data?.metrics) {
        setMetrics(overviewJson.data.metrics);
      }
      if (sitesJson.data) {
        setSites(sitesJson.data);
      }
      if (clientsJson.data) {
        setClients(clientsJson.data);
        if (clientsJson.data.length > 0 && !formClientId) {
          setFormClientId(clientsJson.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick run live check on a site
  const handleQuickCheck = async (site: SiteItem) => {
    setCheckingSiteId(site.id);
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
        const latency = json.data?.latencyMs;
        showToast(
          `⚡ Live check on ${site.name}: ${pass ? 'HEALTHY (PASS)' : 'DOWN (FAIL)'} · ${latency}ms latency`,
          pass ? 'success' : 'error'
        );
        fetchData();
      } else {
        showToast(json.error?.message || 'Check execution failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error running check', 'error');
    } finally {
      setCheckingSiteId(null);
    }
  };

  // Add website (with optional inline company creation)
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      let targetClientId = formClientId;

      // 1. Create company if user selected "new"
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

      // 2. Register site under target company
      const siteRes = await fetch(`/api/v1/organizations/${orgId}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetClientId,
          name: formSiteName.trim(),
          url: formUrl.trim(),
          checks,
          runImmediateCheck: runImmediate,
        }),
      });

      const siteJson = await siteRes.json();
      if (!siteRes.ok) {
        setFormError(siteJson.error?.message || 'Failed to register site.');
        setSubmitting(false);
        return;
      }

      const initialStatus = siteJson.data?.status || 'pending';
      const initialLatency = siteJson.data?.initialCheck?.latencyMs;
      showToast(
        `✅ Registered ${formSiteName} for monitoring! Initial status: ${initialStatus.toUpperCase()}${initialLatency ? ` (${initialLatency}ms)` : ''}`
      );

      setShowAddSiteModal(false);
      setFormSiteName('');
      setFormUrl('');
      setNewCompanyName('');
      setNewCompanyEmail('');
      setCompanyMode('existing');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Add standalone company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError('');
    setCompanySubmitting(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: standaloneCompanyName.trim(),
          contactEmail: standaloneCompanyEmail.trim() || 'support@agency.com',
          timezone: 'UTC',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCompanyError(json.error?.message || 'Failed to create client company.');
        setCompanySubmitting(false);
        return;
      }

      showToast(`🏢 Company '${standaloneCompanyName}' created! You can now add website URLs under it.`);
      setShowAddCompanyModal(false);
      setStandaloneCompanyName('');
      setStandaloneCompanyEmail('');
      fetchData();
    } catch (err: any) {
      setCompanyError(err.message || 'Network error');
    } finally {
      setCompanySubmitting(false);
    }
  };

  const filteredSites = sites.filter((site) => {
    if (selectedClient === 'all') return true;
    return site.client?.id === selectedClient;
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

      {/* Top Bar */}
      <div className="top-bar">
        <div>
          <h1 className="page-title">Agency Overview</h1>
          <p className="page-subtitle">Real-time portfolio health monitoring & incident vigilance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={fetchData}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAddCompanyModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
            + Add Company
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddSiteModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Add Website URL
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Monitored Sites</span>
            <div className="metric-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
          </div>
          <div className="metric-number">{metrics.totalSites}</div>
          <div className="metric-sub">Across {clients.length} agency clients</div>
        </div>

        <div className="metric-card emerald">
          <div className="metric-header">
            <span className="metric-label">Healthy & Operational</span>
            <div className="metric-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <div className="metric-number" style={{ color: '#34d399' }}>{metrics.healthySites}</div>
          <div className="metric-sub">{metrics.overallHealthScore}% portfolio availability</div>
        </div>

        <div className="metric-card rose">
          <div className="metric-header">
            <span className="metric-label">Active Incidents</span>
            <div className="metric-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
          </div>
          <div className="metric-number" style={{ color: metrics.activeIncidents > 0 ? '#fb7185' : 'inherit' }}>
            {metrics.activeIncidents}
          </div>
          <div className="metric-sub">{metrics.activeIncidents > 0 ? 'Requires team triage' : 'All systems normal'}</div>
        </div>

        <div className="metric-card amber">
          <div className="metric-header">
            <span className="metric-label">SSL Warnings</span>
            <div className="metric-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
          <div className="metric-number" style={{ color: metrics.certificatesExpiringSoon > 0 ? '#fbbf24' : 'inherit' }}>
            {metrics.certificatesExpiringSoon}
          </div>
          <div className="metric-sub">Expiring within 14 days</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Monitored Websites</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Live status summaries, direct test triggers, and telemetry</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filter Client:</span>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
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
                <th>Site Name & Target URL</th>
                <th>Client Company</th>
                <th>Status</th>
                <th>Check Vectors</th>
                <th>Active Alert</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((site) => (
                <tr key={site.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Link href={`/sites/${site.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {site.name}
                      </Link>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {site.url} ↗
                      </a>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {site.client?.name || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${site.status}`}>
                      <span className="status-dot"></span>
                      {site.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {site.enabledChecks?.map((chk) => (
                        <span
                          key={chk}
                          style={{
                            fontSize: '11px',
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
                    </div>
                  </td>
                  <td>
                    {site.openIncidents && site.openIncidents.length > 0 ? (
                      <span style={{ fontSize: '12px', color: '#fb7185', fontWeight: 600 }}>
                        {site.openIncidents[0].title}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No issues</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => handleQuickCheck(site)}
                        disabled={checkingSiteId === site.id}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Execute instant real-time HTTP check"
                      >
                        {checkingSiteId === site.id ? '⚡ Testing...' : '⚡ Test Now'}
                      </button>
                      <Link
                        href={`/sites/${site.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Inspect &rarr;
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSites.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No websites found. Click <strong>+ Add Website URL</strong> above to register a site.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Site Modal (Supports creating new company on the fly) */}
      {showAddSiteModal && (
        <div className="modal-overlay" onClick={() => setShowAddSiteModal(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Add Website URL to Monitor</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Register a URL under an existing or brand-new client company
                </p>
              </div>
              <button
                onClick={() => setShowAddSiteModal(false)}
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

            <form onSubmit={handleAddSite}>
              {/* Company Selection Mode Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Client Company</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('existing')}
                    className={`btn ${companyMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                  >
                    Select Existing Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyMode('new')}
                    className={`btn ${companyMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                  >
                    + Create New Company
                  </button>
                </div>
              </div>

              {companyMode === 'existing' ? (
                <div className="form-group">
                  <label className="form-label">Choose Company</label>
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
                </div>
              ) : (
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Acme Corp or Starlight Logistics"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Company Alert Contact Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. ops@acmecorp.com"
                      value={newCompanyEmail}
                      onChange={(e) => setNewCompanyEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Website Details */}
              <div className="form-group">
                <label className="form-label">Website Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Production Storefront / API"
                  value={formSiteName}
                  onChange={(e) => setFormSiteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Website URL (HTTP or HTTPS)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Protected by SSRF egress inspection. Internal IP ranges and metadata addresses are blocked.
                </span>
              </div>

              {/* Check Capabilities */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Active Monitoring Capabilities</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.http}
                      onChange={(e) => setChecks({ ...checks, http: e.target.checked })}
                    />
                    HTTP Availability (5m)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.tls}
                      onChange={(e) => setChecks({ ...checks, tls: e.target.checked })}
                    />
                    SSL/TLS Certificate
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.dns}
                      onChange={(e) => setChecks({ ...checks, dns: e.target.checked })}
                    />
                    DNS Resolution
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.redirects}
                      onChange={(e) => setChecks({ ...checks, redirects: e.target.checked })}
                    />
                    Redirect Chains
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checks.securityHeaders}
                      onChange={(e) => setChecks({ ...checks, securityHeaders: e.target.checked })}
                    />
                    Security Headers
                  </label>
                </div>
              </div>

              {/* Immediate Check Trigger */}
              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={runImmediate}
                    onChange={(e) => setRunImmediate(e.target.checked)}
                  />
                  <span>
                    <strong>⚡ Run immediate health audit now</strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Executes an instant HTTP probe right upon creation to verify real status & latency
                    </span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSiteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Testing & Registering...' : 'Start Monitoring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Add Company Modal */}
      {showAddCompanyModal && (
        <div className="modal-overlay" onClick={() => setShowAddCompanyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Add Client Company</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Create an agency client organization to organize website fleets
                </p>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {companyError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: '#fb7185', fontSize: '13px', marginBottom: '16px' }}>
                {companyError}
              </div>
            )}

            <form onSubmit={handleAddCompany}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Dynamics Ltd."
                  value={standaloneCompanyName}
                  onChange={(e) => setStandaloneCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Contact Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. contact@apexdynamics.com"
                  value={standaloneCompanyEmail}
                  onChange={(e) => setStandaloneCompanyEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCompanyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={companySubmitting}>
                  {companySubmitting ? 'Creating Company...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

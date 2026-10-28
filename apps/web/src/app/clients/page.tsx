'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SiteSummary {
  id: string;
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  enabledChecks: string[];
}

interface ClientItem {
  id: string;
  name: string;
  slug?: string;
  portalEnabled?: boolean;
  contactEmail: string;
  timezone: string;
  siteCount: number;
  sitesHealthy: number;
  sitesDegraded: number;
  sitesDown: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add Client Modal
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [clientSubmitting, setClientSubmitting] = useState<boolean>(false);
  const [clientError, setClientError] = useState<string>('');

  // Add Site Modal
  const [showAddSiteModal, setShowAddSiteModal] = useState<boolean>(false);
  const [selectedClientForSite, setSelectedClientForSite] = useState<ClientItem | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [runImmediate, setRunImmediate] = useState<boolean>(true);
  const [siteSubmitting, setSiteSubmitting] = useState<boolean>(false);
  const [siteError, setSiteError] = useState<string>('');

  // Expanded client cards
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Testing feedback
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const orgId = 'apex-web';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, sitesRes] = await Promise.all([
        fetch(`/api/v1/organizations/${orgId}/clients`),
        fetch(`/api/v1/organizations/${orgId}/sites`),
      ]);
      const clientsJson = await clientsRes.json();
      const sitesJson = await sitesRes.json();

      if (clientsJson.data) setClients(clientsJson.data);
      if (sitesJson.data) setSites(sitesJson.data);
    } catch (err) {
      console.error('Failed to load clients and sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientSubmitting(true);
    setClientError('');

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientName, contactEmail, timezone }),
      });
      const json = await res.json();

      if (!res.ok) {
        setClientError(json.error?.message || 'Failed to create client company');
        setClientSubmitting(false);
        return;
      }

      showToast(`🏢 Company '${clientName}' registered successfully!`);
      setShowAddClientModal(false);
      setClientName('');
      setContactEmail('');
      loadData();
    } catch (err: any) {
      setClientError(err.message || 'Network error');
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleOpenAddSite = (client: ClientItem) => {
    setSelectedClientForSite(client);
    setSiteName('');
    setSiteUrl('');
    setSiteError('');
    setShowAddSiteModal(true);
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForSite) return;
    setSiteSubmitting(true);
    setSiteError('');

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientForSite.id,
          name: siteName.trim(),
          url: siteUrl.trim(),
          checks: {
            http: true,
            tls: true,
            dns: true,
            redirects: true,
            securityHeaders: true,
          },
          runImmediateCheck: runImmediate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSiteError(json.error?.message || 'Failed to register site URL');
        setSiteSubmitting(false);
        return;
      }

      const status = json.data?.status || 'pending';
      const latency = json.data?.initialCheck?.latencyMs;
      showToast(
        `✅ Added ${siteName} under ${selectedClientForSite.name}! Status: ${status.toUpperCase()}${latency ? ` (${latency}ms)` : ''}`
      );

      setShowAddSiteModal(false);
      loadData();
    } catch (err: any) {
      setSiteError(err.message || 'Network error');
    } finally {
      setSiteSubmitting(false);
    }
  };

  const handleTestSite = async (siteId: string, siteTitle: string) => {
    setTestingSiteId(siteId);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/sites/${siteId}/checks/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkType: 'http' }),
      });
      const json = await res.json();
      if (res.ok) {
        const pass = json.data?.success;
        const latency = json.data?.latencyMs;
        showToast(
          `⚡ Live probe on ${siteTitle}: ${pass ? 'HEALTHY (PASS)' : 'DOWN (FAIL)'} · ${latency}ms latency`,
          pass ? 'success' : 'error'
        );
        loadData();
      } else {
        showToast(json.error?.message || 'Check failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setTestingSiteId(null);
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

      <div className="top-bar">
        <div>
          <h1 className="page-title">Agency Clients & Portals</h1>
          <p className="page-subtitle">
            Manage client companies, attach website URL fleets, and test live scenarios across all clients
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddClientModal(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Add Client Company
        </button>
      </div>

      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Company</th>
                <th>White-Label Portal</th>
                <th>Primary Contact</th>
                <th>Fleet Health</th>
                <th>Monitored URLs</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const clientSites = sites.filter((s: any) => s.client?.id === c.id);
                const isExpanded = expandedClientId === c.id;

                return (
                  <tr key={c.id} style={{ verticalAlign: 'top' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Timezone: {c.timezone}
                      </div>
                    </td>
                    <td>
                      {c.slug ? (
                        <a
                          href={`/portal/${c.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            textDecoration: 'none',
                          }}
                        >
                          /portal/{c.slug}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Inactive</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: 'var(--accent-blue)', fontSize: '13px' }}>{c.contactEmail}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="status-badge healthy" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {c.sitesHealthy} ok
                        </span>
                        {c.sitesDown > 0 && (
                          <span className="status-badge down" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {c.sitesDown} down
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {clientSites.length} {clientSites.length === 1 ? 'URL' : 'URLs'}
                        </span>
                        {clientSites.length > 0 && (
                          <button
                            onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-blue)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '2px 6px',
                            }}
                          >
                            {isExpanded ? 'Hide ▲' : 'Show List ▼'}
                          </button>
                        )}
                      </div>

                      {/* Expanded URLs list */}
                      {isExpanded && clientSites.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {clientSites.map((st) => (
                            <div
                              key={st.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                gap: '10px',
                              }}
                            >
                              <div>
                                <Link
                                  href={`/sites/${st.id}`}
                                  style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px', textDecoration: 'none' }}
                                >
                                  {st.name}
                                </Link>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', fontFamily: 'monospace' }}>
                                  {st.url}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className={`status-badge ${st.status}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                  {st.status.toUpperCase()}
                                </span>
                                <button
                                  onClick={() => handleTestSite(st.id, st.name)}
                                  disabled={testingSiteId === st.id}
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '11px' }}
                                  title="Test live URL"
                                >
                                  {testingSiteId === st.id ? '...' : '⚡ Test'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenAddSite(c)}
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          + Add URL
                        </button>
                        {c.slug && (
                          <a
                            href={`/portal/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px', color: '#0ea5e9' }}
                          >
                            Portal ↗
                          </a>
                        )}
                        <Link
                          href={`/?clientId=${c.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Overview
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {clients.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No client companies found. Click <strong>+ Add Client Company</strong> to create your first client!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="modal-overlay" onClick={() => setShowAddClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Add Client Company</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Register an organization to group client website URLs and grant portal access
                </p>
              </div>
              <button
                onClick={() => setShowAddClientModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {clientError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: '#fb7185', fontSize: '13px', marginBottom: '16px' }}>
                {clientError}
              </div>
            )}

            <form onSubmit={handleCreateClient}>
              <div className="form-group">
                <label className="form-label">Client Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apex Dynamics Ltd."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Contact Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="contact@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client Timezone</label>
                <select
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddClientModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={clientSubmitting}>
                  {clientSubmitting ? 'Creating Company...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Site Modal (Pre-selected for specific client) */}
      {showAddSiteModal && selectedClientForSite && (
        <div className="modal-overlay" onClick={() => setShowAddSiteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Add URL to {selectedClientForSite.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Register a website URL under this company and run immediate health diagnostics
                </p>
              </div>
              <button
                onClick={() => setShowAddSiteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {siteError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: '#fb7185', fontSize: '13px', marginBottom: '16px' }}>
                {siteError}
              </div>
            )}

            <form onSubmit={handleCreateSite}>
              <div className="form-group">
                <label className="form-label">Website Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Production Storefront / API"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Website URL *</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://clientdomain.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  SSRF safe guard validated. Must be a public HTTP/HTTPS URL.
                </span>
              </div>

              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={runImmediate}
                    onChange={(e) => setRunImmediate(e.target.checked)}
                  />
                  <span>
                    <strong>⚡ Run immediate health audit upon creation</strong>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Executes an instant probe to evaluate status & response latency immediately
                    </span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddSiteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={siteSubmitting}>
                  {siteSubmitting ? 'Registering & Probing...' : 'Add Website URL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

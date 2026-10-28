'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface IncidentItem {
  id: string;
  siteId: string;
  siteName: string;
  siteUrl: string;
  clientName: string;
  checkType: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'resolved';
  title: string;
  openedAt: string;
  resolvedAt?: string;
  lastSeenAt: string;
  latestEvent?: {
    eventType: string;
    message: string;
    createdAt: string;
  };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [remediationNote, setRemediationNote] = useState<string>('');
  const [loggingRemediation, setLoggingRemediation] = useState<boolean>(false);
  const [verifyingFix, setVerifyingFix] = useState<boolean>(false);

  const orgId = 'apex-web';

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/organizations/${orgId}/incidents?status=${statusFilter}`);
      const json = await res.json();
      if (json.data) setIncidents(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const viewDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/incidents/${id}`);
      const json = await res.json();
      if (json.data) setSelectedIncident(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await fetch(`/api/v1/organizations/${orgId}/incidents/${id}/acknowledge`, { method: 'POST' });
      fetchIncidents();
      if (selectedIncident?.id === id) viewDetails(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await fetch(`/api/v1/organizations/${orgId}/incidents/${id}/resolve`, { method: 'POST' });
      fetchIncidents();
      if (selectedIncident?.id === id) viewDetails(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogRemediation = async (id: string) => {
    if (!remediationNote.trim()) return;
    setLoggingRemediation(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/incidents/${id}/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remediationNotes: remediationNote }),
      });
      if (res.ok) {
        setRemediationNote('');
        fetchIncidents();
        viewDetails(id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingRemediation(false);
    }
  };

  const handleVerifyFix = async (id: string) => {
    setVerifyingFix(true);
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/incidents/${id}/verify-fix`, {
        method: 'POST',
      });
      const json = await res.json();
      fetchIncidents();
      viewDetails(id);
      alert(json.message);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Verification check failed');
    } finally {
      setVerifyingFix(false);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 className="page-title">Incidents & Outages</h1>
          <p className="page-subtitle">Deduplicated incident lifecycle and audit trail</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((st) => (
            <button
              key={st}
              className={`btn ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '13px' }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedIncident ? '1fr 420px' : '1fr', gap: '24px' }}>
        <div className="glass-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident / Property</th>
                  <th>Client</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Detected At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => viewDetails(inc.id)}
                    style={{ cursor: 'pointer', background: selectedIncident?.id === inc.id ? 'rgba(59, 130, 246, 0.08)' : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inc.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {inc.siteName} · <code style={{ fontSize: '11px' }}>{inc.checkType}</code>
                      </div>
                    </td>
                    <td>{inc.clientName}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            inc.severity === 'critical'
                              ? 'rgba(244, 63, 94, 0.15)'
                              : inc.severity === 'warning'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          color:
                            inc.severity === 'critical'
                              ? '#fb7185'
                              : inc.severity === 'warning'
                              ? '#fbbf24'
                              : '#60a5fa',
                        }}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${inc.status === 'resolved' ? 'healthy' : inc.status === 'open' ? 'down' : 'degraded'}`}>
                        {inc.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {new Date(inc.openedAt).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetails(inc.id);
                        }}
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))}

                {incidents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No incidents matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Incident Inspector Drawer */}
        {selectedIncident && (
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Incident Details</div>
              <button onClick={() => setSelectedIncident(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedIncident.title}</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedIncident.site?.name} ({selectedIncident.site?.url})</div>
            </div>

            {/* 1. Automated Root Cause Diagnosis */}
            {selectedIncident.likelyCause && (
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
                  🧠 Automated Root-Cause Diagnosis
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {selectedIncident.likelyCause}
                </div>
                {selectedIncident.recommendedFix && (
                  <div style={{ fontSize: '12px', color: '#93c5fd', borderTop: '1px dashed rgba(59, 130, 246, 0.2)', paddingTop: '6px' }}>
                    <strong>Recommended Remediation:</strong> {selectedIncident.recommendedFix}
                  </div>
                )}
              </div>
            )}

            {/* 2. Remediation Fix Logger & Verify Fix Runner */}
            {selectedIncident.status !== 'resolved' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                  🛠️ Agency Remediation Action
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Restarted process, expanded DB pool, renewed SSL..."
                    value={remediationNote}
                    onChange={(e) => setRemediationNote(e.target.value)}
                    style={{ fontSize: '13px', padding: '8px 12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '7px 10px' }}
                    onClick={() => handleLogRemediation(selectedIncident.id)}
                    disabled={!remediationNote.trim() || loggingRemediation}
                  >
                    {loggingRemediation ? 'Logging...' : 'Log Remediation Note'}
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '7px 10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    onClick={() => handleVerifyFix(selectedIncident.id)}
                    disabled={verifyingFix}
                  >
                    {verifyingFix ? 'Verifying...' : '⚡ Verify Fix Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Verification Evidence (if resolved & verified) */}
            {selectedIncident.verifiedAt && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                  <span>✓</span> Remediation Verified
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Verified by <strong>{selectedIncident.remediationActor || 'Engineer'}</strong> at {new Date(selectedIncident.verifiedAt).toLocaleTimeString()}.
                </div>
                {selectedIncident.remediationNotes && (
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontStyle: 'italic', marginTop: '4px' }}>
                    "{selectedIncident.remediationNotes}"
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {selectedIncident.status === 'open' && (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                  onClick={() => handleAcknowledge(selectedIncident.id)}
                >
                  Acknowledge
                </button>
              )}
              {selectedIncident.status !== 'resolved' && (
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                  onClick={() => handleResolve(selectedIncident.id)}
                >
                  Mark Resolved (Manual)
                </button>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px' }}>
                Event Timeline Audit Trail
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedIncident.events?.map((ev: any) => (
                  <div key={ev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>{ev.eventType}</span>
                      <span>{new Date(ev.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ev.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

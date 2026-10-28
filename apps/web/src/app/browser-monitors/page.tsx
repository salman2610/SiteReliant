'use client';

import { useState, useEffect } from 'react';

interface BrowserMonitorItem {
  id: string;
  name: string;
  description: string | null;
  siteId: string;
  siteName: string;
  siteUrl: string;
  siteStatus: string;
  intervalSeconds: number;
  timeoutMs: number;
  enabled: boolean;
  createdAt: string;
  lastRun: {
    id: string;
    status: string;
    durationMs: number;
    failureMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
}

interface RunStep {
  id: string;
  stepIndex: number;
  action: string;
  targetSelector: string | null;
  redactedValue: string | null;
  status: string;
  durationMs: number;
  errorMessage: string | null;
}

interface RunDetails {
  id: string;
  status: string;
  durationMs: number;
  failureStepIndex: number | null;
  failureMessage: string | null;
  errorCategory: string | null;
  startedAt: string;
  monitor: {
    id: string;
    name: string;
  };
  steps: RunStep[];
  assertions: {
    id: string;
    assertionType: string;
    expectedValue: string;
    actualValue: string | null;
    passed: boolean;
  }[];
  artifacts: {
    id: string;
    artifactType: string;
    storageKey: string | null;
    metadataJson: any;
  }[];
}

export default function BrowserMonitorsPage() {
  const [monitors, setMonitors] = useState<BrowserMonitorItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetails | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const orgId = 'apex-web';

  const fetchMonitors = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/organizations/${orgId}/browser-monitors`);
      const json = await res.json();
      if (json.data) setMonitors(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleRunNow = async (monitorId: string) => {
    try {
      setRunningId(monitorId);
      const res = await fetch(`http://localhost:4000/api/v1/organizations/${orgId}/browser-monitors/${monitorId}/run`, {
        method: 'POST',
      });
      const json = await res.json();

      if (res.ok) {
        setToast(`Synthetic Chromium check completed with status: ${json.data.status.toUpperCase()}`);
        setTimeout(() => setToast(''), 4000);
        fetchMonitors();
        // Load details
        handleInspectRun(json.data.runId);
      } else {
        setToast(`Execution error: ${json.error?.message}`);
      }
    } catch (err: any) {
      setToast(err.message || 'Run execution failed');
    } finally {
      setRunningId(null);
    }
  };

  const handleInspectRun = async (runId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/organizations/${orgId}/browser-runs/${runId}`);
      const json = await res.json();
      if (json.data) setSelectedRun(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 className="page-title">BrowserGuard · Synthetic Browser Monitoring</h1>
          <p className="page-subtitle">
            Simulate real Chromium user journeys, test contact forms & checkouts, and inspect failure evidence screenshots
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setToast('Tip: Use preset template or POST /api/v1/organizations/:id/browser-monitors to register custom workflows.');
            setTimeout(() => setToast(''), 5000);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Synthetic Monitor
        </button>
      </div>

      {toast && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(14, 165, 233, 0.15)',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          borderRadius: '8px',
          color: '#38bdf8',
          fontSize: '13px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {toast}
        </div>
      )}

      {/* Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: '28px' }}>
        <div className="metric-card">
          <div className="metric-label">Active Synthetic Monitors</div>
          <div className="metric-value">{monitors.length}</div>
          <div className="metric-subtext">Automated Chromium checks</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Workflow Health</div>
          <div className="metric-value" style={{ color: '#10b981' }}>
            {monitors.filter((m) => m.lastRun?.status === 'passed').length} / {monitors.length || 1}
          </div>
          <div className="metric-subtext">Journeys operational</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Process Security</div>
          <div className="metric-value" style={{ color: '#0ea5e9', fontSize: '20px' }}>Zero-Trust</div>
          <div className="metric-subtext">SSRF route filter active</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Evidence Verification</div>
          <div className="metric-value" style={{ color: '#8b5cf6', fontSize: '20px' }}>Automated</div>
          <div className="metric-subtext">Screenshots + SHA-256 hashes</div>
        </div>
      </div>

      {/* Monitors Table */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Configured Browser Workflows
        </h2>

        {monitors.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            <p>No browser monitors configured yet. Add a monitor to start synthetic Chromium checks.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workflow Name</th>
                  <th>Monitored Property</th>
                  <th>Cadence</th>
                  <th>Latest Run Status</th>
                  <th>Execution Duration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                      {m.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{m.description}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#fff' }}>{m.siteName}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{m.siteUrl}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        Every {Math.round(m.intervalSeconds / 60)} min
                      </span>
                    </td>
                    <td>
                      {m.lastRun ? (
                        <span className={`status-badge ${m.lastRun.status === 'passed' ? 'healthy' : 'down'}`}>
                          {m.lastRun.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                          PENDING
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                        {m.lastRun ? `${m.lastRun.durationMs} ms` : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleRunNow(m.id)}
                          disabled={runningId === m.id}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          {runningId === m.id ? 'Running Chrome...' : 'Run Now'}
                        </button>
                        {m.lastRun && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleInspectRun(m.lastRun!.id)}
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#0ea5e9' }}
                          >
                            Inspect Run
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Run Drawer / Modal */}
      {selectedRun && (
        <div className="glass-card" style={{ border: '1px solid rgba(14, 165, 233, 0.4)', background: 'rgba(11, 15, 25, 0.95)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0ea5e9', fontWeight: 700 }}>
                Chromium Execution Trace
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                Run Details: {selectedRun.monitor.name}
              </h2>
            </div>
            <button
              onClick={() => setSelectedRun(null)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Close Trace
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="metric-label">Run Status</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: selectedRun.status === 'passed' ? '#10b981' : '#f43f5e', marginTop: '4px' }}>
                {selectedRun.status.toUpperCase()}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="metric-label">Total Execution Time</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                {selectedRun.durationMs} ms
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="metric-label">Failure Diagnostic</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: selectedRun.errorCategory ? '#f59e0b' : '#94a3b8', marginTop: '4px' }}>
                {selectedRun.errorCategory || 'None (All steps passed)'}
              </div>
            </div>
          </div>

          {/* Steps Timeline */}
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
            Step-by-Step Execution Journey
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {selectedRun.steps.map((st) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: st.status === 'passed' ? 'rgba(16, 185, 129, 0.05)' : st.status === 'failed' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${st.status === 'passed' ? 'rgba(16, 185, 129, 0.2)' : st.status === 'failed' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: st.status === 'passed' ? 'rgba(16, 185, 129, 0.2)' : st.status === 'failed' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: st.status === 'passed' ? '#10b981' : st.status === 'failed' ? '#f43f5e' : '#94a3b8',
                  }}>
                    {st.stepIndex + 1}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px', textTransform: 'capitalize' }}>
                      {st.action}:
                    </span>
                    <span style={{ marginLeft: '6px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {st.targetSelector || st.redactedValue || '—'}
                    </span>
                    {st.errorMessage && (
                      <div style={{ fontSize: '12px', color: '#fb7185', marginTop: '2px' }}>
                        {st.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{st.durationMs} ms</span>
                  <span className={`status-badge ${st.status === 'passed' ? 'healthy' : st.status === 'failed' ? 'down' : 'pending'}`}>
                    {st.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Screenshot Artifacts Display */}
          {selectedRun.artifacts.some((a) => a.artifactType === 'screenshot') && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                Captured Screenshot Evidence
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {selectedRun.artifacts
                  .filter((a) => a.artifactType === 'screenshot' && a.storageKey)
                  .map((art) => {
                    const filename = art.storageKey!.replace('screenshots/', '');
                    return (
                      <div key={art.id} style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'monospace' }}>
                          {art.storageKey}
                        </div>
                        <img
                          src={`http://localhost:4000/api/v1/artifacts/screenshots/${filename}`}
                          alt="Failure Screenshot"
                          style={{ maxWidth: '420px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

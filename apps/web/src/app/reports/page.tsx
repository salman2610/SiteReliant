'use client';

import { useState, useEffect } from 'react';

interface ReportItem {
  id: string;
  clientId: string;
  client: { name: string; contactEmail: string };
  periodStart: string;
  periodEnd: string;
  uptimePercentage: number;
  status: string;
  contentHash: string;
  generatedAt: string;
  sentAt?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [toast, setToast] = useState<string>('');

  const orgId = 'apex-web';

  const fetchData = async () => {
    try {
      const [repRes, cliRes] = await Promise.all([
        fetch(`/api/v1/organizations/${orgId}/reports`),
        fetch(`/api/v1/organizations/${orgId}/clients`),
      ]);
      const repJson = await repRes.json();
      const cliJson = await cliRes.json();

      if (repJson.data) setReports(repJson.data);
      if (cliJson.data) {
        setClients(cliJson.data);
        if (cliJson.data.length > 0 && !selectedClientId) {
          setSelectedClientId(cliJson.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    setToast('');

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const json = await res.json();
      if (res.ok) {
        setToast('Monthly report compiled and verified.');
        fetchData();
        setPreviewReportId(json.data.id);
      } else {
        setToast(json.error?.message || 'Failed to generate report.');
      }
    } catch (err: any) {
      setToast(err.message || 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/reports/${reportId}/send`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        setToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      setToast(err.message || 'Failed to send report');
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 className="page-title">Branded Monthly Reports</h1>
          <p className="page-subtitle">Generate and deliver verified availability reports to agency clients</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button className="btn btn-primary" onClick={handleGenerateReport} disabled={generating}>
            {generating ? 'Compiling Report...' : 'Generate Monthly Report'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ padding: '12px 18px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#93c5fd', fontSize: '13px', marginBottom: '24px' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: previewReportId ? '1fr 500px' : '1fr', gap: '24px' }}>
        <div className="glass-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Reporting Period</th>
                  <th>Uptime Outcome</th>
                  <th>Integrity Hash</th>
                  <th>Delivery Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => (
                  <tr key={rep.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rep.client.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rep.client.contactEmail}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {new Date(rep.periodStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className="status-badge healthy" style={{ fontSize: '12px', padding: '2px 8px' }}>
                        {rep.uptimePercentage?.toFixed(2) ?? '100.00'}%
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', color: 'var(--accent-violet)' }}>
                        {rep.contentHash ? rep.contentHash.substring(0, 12) + '...' : 'pending'}
                      </code>
                    </td>
                    <td>
                      {rep.sentAt ? (
                        <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                          Delivered {new Date(rep.sentAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Draft / Not sent</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setPreviewReportId(rep.id)}
                        >
                          Preview
                        </button>
                        <a
                          href={`/api/v1/organizations/${orgId}/reports/${rep.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Open HTML ↗
                        </a>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => handleSendReport(rep.id)}
                        >
                          Send Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Preview Drawer */}
        {previewReportId && (
          <div className="glass-card" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Report Preview</div>
              <button onClick={() => setPreviewReportId(null)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <iframe
              src={`/api/v1/organizations/${orgId}/reports/${previewReportId}/view`}
              style={{
                width: '100%',
                flex: 1,
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: '#ffffff',
              }}
              title="Report Preview Frame"
            />
          </div>
        )}
      </div>
    </div>
  );
}

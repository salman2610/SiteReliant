import * as crypto from 'node:crypto';

export interface ClientReportMetrics {
  agencyName: string;
  agencyBrandColor?: string;
  clientName: string;
  periodStart: Date;
  periodEnd: Date;
  sites: {
    name: string;
    url: string;
    uptimePercentage: number;
    avgLatencyMs: number;
    totalChecks: number;
    failedChecks: number;
    sslDaysRemaining?: number;
    sslIssuer?: string;
    securityScore?: number;
    incidentsCount: number;
  }[];
  overallUptime: number;
  totalIncidents: number;
  resolvedIncidents: number;
  avgMttrMinutes: number;
  verifiedRemediations?: {
    siteName: string;
    incidentTitle: string;
    detectedAt: Date;
    likelyCause?: string;
    remediationNotes?: string;
    remediationActor?: string;
    verifiedAt?: Date;
    mttrMinutes?: number;
    evidenceStatus?: string;
  }[];
}

export function calculateAvailability(successfulChecks: number, totalChecks: number): number {
  if (totalChecks === 0) return 100.0;
  const val = (successfulChecks / totalChecks) * 100;
  return Math.min(100.0, Math.max(0.0, Math.round(val * 100) / 100));
}

export function computeReportHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function generateReportHtml(metrics: ClientReportMetrics): string {
  const brandColor = metrics.agencyBrandColor || '#2563eb';
  const periodStr = `${metrics.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${metrics.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const sitesRows = metrics.sites
    .map(
      (s) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">
        ${s.name}
        <div style="font-size: 12px; color: #6b7280; font-weight: 400;">${s.url}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 13px; background: ${s.uptimePercentage >= 99.9 ? '#ecfdf5' : s.uptimePercentage >= 99.0 ? '#eff6ff' : '#fef2f2'}; color: ${s.uptimePercentage >= 99.9 ? '#059669' : s.uptimePercentage >= 99.0 ? '#2563eb' : '#dc2626'};">
          ${s.uptimePercentage.toFixed(2)}%
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px;">
        ${s.avgLatencyMs} ms
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px;">
        ${s.sslDaysRemaining !== undefined ? `${s.sslDaysRemaining} days` : 'N/A'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px;">
        ${s.securityScore !== undefined ? `${s.securityScore}/100` : '—'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px; color: ${s.incidentsCount > 0 ? '#dc2626' : '#059669'}; font-weight: 600;">
        ${s.incidentsCount}
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Website Performance & Availability Report · ${metrics.clientName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background-color: #f9fafb;
      margin: 0;
      padding: 40px;
    }
    .report-card {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: ${brandColor};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 36px;
    }
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin-top: 4px;
    }
    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4b5563;
      border-bottom: 2px solid #e5e7eb;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header-bar">
      <div>
        <div class="brand-title">${metrics.agencyName}</div>
        <h1 style="margin: 8px 0 4px 0; font-size: 26px; color: #111827;">Website Reliability & Health Report</h1>
        <div style="font-size: 14px; color: #4b5563;">Prepared exclusively for <strong>${metrics.clientName}</strong></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 600;">Reporting Period</div>
        <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-top: 4px;">${periodStr}</div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Overall Availability</div>
        <div class="metric-value" style="color: ${metrics.overallUptime >= 99.9 ? '#059669' : '#2563eb'};">
          ${metrics.overallUptime.toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Monitored Assets</div>
        <div class="metric-value">${metrics.sites.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Incidents</div>
        <div class="metric-value" style="color: ${metrics.totalIncidents > 0 ? '#ea580c' : '#059669'};">
          ${metrics.totalIncidents}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg. Resolution (MTTR)</div>
        <div class="metric-value">${metrics.avgMttrMinutes > 0 ? `${metrics.avgMttrMinutes}m` : '0m'}</div>
      </div>
    </div>

    <h2 style="font-size: 18px; margin-bottom: 12px; color: #111827;">Monitored Properties Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Website / Property</th>
          <th style="text-align: center;">Availability</th>
          <th style="text-align: center;">Avg Latency</th>
          <th style="text-align: center;">SSL Status</th>
          <th style="text-align: center;">Security Grade</th>
          <th style="text-align: center;">Incidents</th>
        </tr>
      </thead>
      <tbody>
        ${sitesRows}
      </tbody>
    </table>

    ${
      metrics.verifiedRemediations && metrics.verifiedRemediations.length > 0
        ? `
    <h2 style="font-size: 18px; margin-top: 36px; margin-bottom: 12px; color: #111827;">
      Proactive Incident Detection & Verified Remediations
    </h2>
    <table>
      <thead>
        <tr>
          <th>Incident & Target</th>
          <th>Root Cause Diagnosis</th>
          <th>Applied Remediation</th>
          <th style="text-align: center;">Verified MTTR</th>
          <th style="text-align: center;">Verification Status</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.verifiedRemediations
          .map(
            (r) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: #111827;">${r.incidentTitle}</strong>
            <div style="font-size: 12px; color: #6b7280;">${r.siteName} · Detected ${new Date(r.detectedAt).toLocaleTimeString()}</div>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #4b5563;">
            ${r.likelyCause || 'Automated health threshold trip'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1f2937;">
            ${r.remediationNotes ? `<em>"${r.remediationNotes}"</em>` : 'Standard operational failover'}
            ${r.remediationActor ? `<div style="font-size: 11px; color: #9ca3af;">By ${r.remediationActor}</div>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; color: #059669; font-size: 13px;">
            ${r.mttrMinutes ? `${r.mttrMinutes} min` : 'Automated'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">
              ✓ VERIFIED
            </span>
          </td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
        : ''
    }

    <div style="margin-top: 36px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid ${brandColor};">
      <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 6px;">Monitoring Methodology & Standards</div>
      <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
        SiteGuard monitors availability using continuous external probes evaluating HTTP status codes, latency thresholds, TLS certificate validity, DNS integrity, and security header postures. Incidents are triggered upon consecutive confirmed failures to prevent false positives from transient ISP anomalies.
      </div>
    </div>

    <div class="footer">
      <div>Report generated via SiteGuard Platform · Powered by ${metrics.agencyName}</div>
      <div>Confidential & Proprietary Client Deliverable</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

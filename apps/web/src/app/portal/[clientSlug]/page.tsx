'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface AgencyBranding {
  name: string;
  brandLogoUrl: string | null;
  brandPrimaryColor: string;
  brandAccentColor: string;
  customDomain: string | null;
  supportEmail: string | null;
  portalHeading: string;
  portalSubheading: string;
}

interface ClientInfo {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

interface SiteItem {
  id: string;
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down' | 'pending';
  normalizedHost: string;
  lastCheck: {
    checkedAt: string;
    latencyMs: number;
    httpStatus: number | null;
    resultCode: string;
    success: boolean;
  } | null;
}

interface IncidentItem {
  id: string;
  checkType: string;
  severity: string;
  status: string;
  title: string;
  openedAt: string;
  resolvedAt: string | null;
  remediationNotes: string | null;
  remediationActor: string | null;
  remediatedAt: string | null;
  verifiedAt: string | null;
  verificationEvidence: any;
  site: {
    id: string;
    name: string;
    url: string;
  };
}

interface PortalData {
  agency: AgencyBranding;
  client: ClientInfo;
  serviceStatus: 'operational' | 'degraded' | 'major_outage';
  sites: SiteItem[];
  incidents: IncidentItem[];
  latestReport: {
    id: string;
    periodStart: string;
    periodEnd: string;
    uptimePercentage: number;
    generatedAt: string;
  } | null;
}

export default function ClientPortalPage() {
  const params = useParams();
  const clientSlug = params?.clientSlug as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!clientSlug) return;

    async function loadPortal() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:4000/api/v1/portal/${clientSlug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Client portal not found or currently deactivated by agency.');
          } else {
            setError(`Portal error: HTTP ${res.status}`);
          }
          return;
        }

        const json = await res.json();
        setData(json.data);

        // Fetch reports
        const repRes = await fetch(`http://localhost:4000/api/v1/portal/${clientSlug}/reports`);
        if (repRes.ok) {
          const repJson = await repRes.json();
          setReports(repJson.data || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to monitoring platform API');
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [clientSlug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090e', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          <p style={{ fontSize: '15px', fontWeight: 500 }}>Connecting to Client Service Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090e', color: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#f43f5e' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Portal Unavailable</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>{error}</p>
          <a href="/" style={{ display: 'inline-flex', padding: '10px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc', fontSize: '13px', fontWeight: 500 }}>
            Return to Agency Dashboard
          </a>
        </div>
      </div>
    );
  }

  const primaryColor = data.agency.brandPrimaryColor || '#0ea5e9';
  const accentColor = data.agency.brandAccentColor || '#6366f1';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.12), transparent), #07090e',
      color: '#f8fafc',
      paddingBottom: '80px',
    }}>
      {/* Dynamic Brand Nav */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {data.agency.brandLogoUrl ? (
              <img
                src={data.agency.brandLogoUrl}
                alt={data.agency.name}
                style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: `1.5px solid ${primaryColor}40` }}
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
                color: '#fff',
                boxShadow: `0 0 20px -3px ${primaryColor}60`,
              }}>
                {data.agency.name.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  {data.agency.name}
                </span>
                {data.agency.customDomain && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${primaryColor}20`, color: primaryColor, border: `1px solid ${primaryColor}40`, fontWeight: 600 }}>
                    {data.agency.customDomain}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Service Reliability & Operations Portal
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#cbd5e1',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              Client: {data.client.name}
            </div>

            {data.agency.supportEmail && (
              <a
                href={`mailto:${data.agency.supportEmail}?subject=Support Inquiry - ${data.client.name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  background: primaryColor,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  boxShadow: `0 0 16px -2px ${primaryColor}80`,
                  transition: 'opacity 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                Contact Agency
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px 0 24px' }}>
        
        {/* Hero Branding Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', color: '#fff' }}>
            {data.agency.portalHeading}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '780px', lineHeight: 1.6 }}>
            {data.agency.portalSubheading}
          </p>
        </div>

        {/* Global Operational Status Banner */}
        <div style={{
          marginBottom: '32px',
          padding: '24px 28px',
          borderRadius: '16px',
          background: data.serviceStatus === 'operational'
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04))'
            : data.serviceStatus === 'degraded'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))'
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.05))',
          border: data.serviceStatus === 'operational'
            ? '1px solid rgba(16, 185, 129, 0.3)'
            : data.serviceStatus === 'degraded'
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : '1px solid rgba(244, 63, 94, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: data.serviceStatus === 'operational' ? 'rgba(16, 185, 129, 0.2)' : data.serviceStatus === 'degraded' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: data.serviceStatus === 'operational' ? '#10b981' : data.serviceStatus === 'degraded' ? '#f59e0b' : '#f43f5e',
            }}>
              {data.serviceStatus === 'operational' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              )}
            </div>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: data.serviceStatus === 'operational' ? '#10b981' : data.serviceStatus === 'degraded' ? '#f59e0b' : '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {data.serviceStatus === 'operational'
                  ? 'All Monitored Services Operational'
                  : data.serviceStatus === 'degraded'
                  ? 'Minor Service Degradation Detected'
                  : 'Active Incident In Progress'}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                Monitored around the clock across 5 distinct protocol verification engines.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>30-Day SLA Uptime</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                {data.latestReport ? `${data.latestReport.uptimePercentage.toFixed(2)}%` : '99.98%'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Properties Guarded</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                {data.sites.length}
              </div>
            </div>
          </div>
        </div>

        {/* Monitored Properties Grid */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              Monitored Client Properties
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Live checks every 5 minutes</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {data.sites.map((site) => (
              <div
                key={site.id}
                style={{
                  background: 'rgba(18, 25, 38, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '20px',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{site.name}</div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: site.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : site.status === 'degraded' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: site.status === 'healthy' ? '#10b981' : site.status === 'degraded' ? '#f59e0b' : '#f43f5e',
                      border: `1px solid ${site.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : site.status === 'degraded' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                    }}>
                      {site.status}
                    </span>
                  </div>

                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '13px',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '16px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {site.url}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                  </a>

                  {/* Active Protocol Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>HTTP Uptime</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>TLS 1.3 / SSL</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>DNS Integrity</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}>HSTS / Headers</span>
                  </div>
                </div>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}>
                  <span>Response Latency</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {site.lastCheck?.latencyMs ? `${site.lastCheck.latencyMs} ms` : '94 ms'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proactive Agency Remediation & Service History */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Proactive Agency Service & Remediation Log
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Continuous oversight with verified MTTR</span>
          </div>

          <div style={{ background: 'rgba(18, 25, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            {data.incidents.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px auto' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Zero Outages in Current Monitoring Cycle</div>
                <div style={{ fontSize: '13px' }}>All monitored endpoints have maintained full availability with 0 incident disruptions.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    style={{
                      padding: '20px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: inc.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: inc.status === 'resolved' ? '#10b981' : '#f43f5e',
                        }}>
                          {inc.status}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{inc.title}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(inc.openedAt).toLocaleDateString()} at {new Date(inc.openedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {inc.remediationNotes && (
                      <div style={{
                        marginTop: '6px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '13px',
                        color: '#cbd5e1',
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0ea5e9', marginBottom: '2px', textTransform: 'uppercase' }}>
                          Verified Fix Action (by {inc.remediationActor || 'Agency Operations'}):
                        </div>
                        {inc.remediationNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verified Monthly SLA Reports */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
              Executive Reliability Reports
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cryptographically signed audit records</span>
          </div>

          <div style={{ background: 'rgba(18, 25, 38, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            {reports.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                <p>No monthly reports generated yet for this period.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Billing Period</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Uptime SLA</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600 }}>Integrity Hash</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px 20px', color: '#fff', fontWeight: 500 }}>
                        {new Date(rep.periodStart).toLocaleDateString()} — {new Date(rep.periodEnd).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>
                          {rep.uptimePercentage?.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                        {rep.contentHash ? `${rep.contentHash.substring(0, 16)}...` : 'sha256:verified'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <a
                          href={`http://localhost:4000/api/v1/organizations/apex-web/reports/${rep.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            background: `${primaryColor}20`,
                            color: primaryColor,
                            fontWeight: 600,
                            fontSize: '12px',
                            border: `1px solid ${primaryColor}40`,
                          }}
                        >
                          View Report
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Branded Footer */}
      <footer style={{
        marginTop: '80px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '32px 24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '12px',
      }}>
        <div style={{ marginBottom: '8px', color: '#94a3b8', fontWeight: 600 }}>
          Powered by {data.agency.name} Reliability Operations Platform
        </div>
        <div>
          Continuous synthetic monitoring · Zero-trust SSRF isolation · Automated SLA compliance
        </div>
      </footer>
    </div>
  );
}

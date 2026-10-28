'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public marketing & authentication routes do not use the authenticated dashboard sidebar
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/features' ||
    pathname === '/pricing' ||
    pathname === '/docs' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/onboarding' ||
    pathname?.startsWith('/portal');

  if (isPublicRoute) {
    return <main style={{ minHeight: '100vh', width: '100%' }}>{children}</main>;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ padding: '0 8px 18px 8px' }}>
          <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <img
              src="/branding/logo-dark-transparent.png"
              alt="SiteReliant - Detect Diagnose Verify"
              style={{ height: '36px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
            />
            <div className="sidebar-org-badge" style={{ alignSelf: 'flex-start' }}>Agency Workspace</div>
          </Link>
        </div>

        {/* WORKSPACE SECTION */}
        <div className="nav-section">
          <div className="nav-section-title">Workspace</div>
          <nav className="nav-group">
            <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' || pathname === '/app' ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Overview
            </Link>
            <Link href="/monitors" className={`nav-link ${pathname?.startsWith('/monitors') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Websites &amp; Monitors
            </Link>
            <Link href="/incidents" className={`nav-link ${pathname === '/incidents' ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              Incidents
            </Link>
            <Link href="/browser-monitors" className={`nav-link ${pathname?.startsWith('/browser-monitors') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
              Browser Tests
            </Link>
            <Link href="/incidents?tab=remediations" className={`nav-link ${pathname?.includes('tab=remediations') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Remediations
            </Link>
            <Link href="/reports" className={`nav-link ${pathname?.startsWith('/reports') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              Reports
            </Link>
          </nav>
        </div>

        {/* AGENCY SECTION */}
        <div className="nav-section" style={{ flexGrow: 1 }}>
          <div className="nav-section-title">Agency</div>
          <nav className="nav-group">
            <Link href="/clients" className={`nav-link ${pathname?.startsWith('/clients') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Clients &amp; Portals
            </Link>
            <Link href="/settings?tab=branding" className={`nav-link ${pathname === '/settings' && typeof window !== 'undefined' && window.location.search.includes('branding') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              Branding
            </Link>
            <Link href="/settings?tab=email" className={`nav-link ${pathname === '/settings' && typeof window !== 'undefined' && window.location.search.includes('email') ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email &amp; Notifications
            </Link>
            <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Settings &amp; Billing
            </Link>
          </nav>
        </div>

        {/* OPERATOR INFO & LOGOUT */}
        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Apex Web Studio</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>Salmanul Faris</div>
            </div>
            <Link
              href="/login"
              title="Sign Out"
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Exit
            </Link>
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            Agency Pro Plan · Active
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

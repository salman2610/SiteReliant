'use client';

import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="public-site">
      <header className="public-nav">
        <Link href="/" className="public-logo">
          <img
            src="/branding/logo-dark-transparent.png"
            alt="SiteReliant - Detect Diagnose Verify"
            style={{ height: '38px', width: 'auto', display: 'block' }}
          />
        </Link>

        <nav className="public-nav-links">
          <Link href="/features" className="public-nav-link">Features</Link>
          <Link href="/pricing" className="public-nav-link">Pricing</Link>
          <Link href="/docs" className="public-nav-link active">Docs</Link>
          <Link href="/#how-it-works" className="public-nav-link">How It Works</Link>
          <Link href="/#security" className="public-nav-link">Security</Link>
        </nav>

        <div className="public-nav-actions">
          <Link href="/login" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            Start free trial
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', display: 'flex', gap: '48px' }}>
        {/* Docs Sidebar */}
        <aside style={{ width: '240px', flexShrink: 0, position: 'sticky', top: '90px', height: 'calc(100vh - 120px)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Getting Started
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '28px' }}>
            <li><a href="#quickstart" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Quickstart Guide</a></li>
            <li><a href="#adding-sites" style={{ color: 'var(--text-secondary)' }}>Adding Websites</a></li>
            <li><a href="#check-types" style={{ color: 'var(--text-secondary)' }}>Check Types</a></li>
          </ul>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Operations
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '28px' }}>
            <li><a href="#browserguard" style={{ color: 'var(--text-secondary)' }}>BrowserGuard Journeys</a></li>
            <li><a href="#incident-workflow" style={{ color: 'var(--text-secondary)' }}>Incident MTTR Workflow</a></li>
            <li><a href="#portals" style={{ color: 'var(--text-secondary)' }}>White-Label Portals</a></li>
          </ul>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Security &amp; API
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <li><a href="#ssrf" style={{ color: 'var(--text-secondary)' }}>SSRF Policy &amp; Egress</a></li>
            <li><a href="#api" style={{ color: 'var(--text-secondary)' }}>REST API Reference</a></li>
          </ul>
        </aside>

        {/* Docs Content */}
        <div style={{ flexGrow: 1, maxWidth: '840px' }}>
          <section id="quickstart" style={{ marginBottom: '60px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>SiteReliant Documentation</h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Welcome to the SiteReliant platform guide. SiteReliant is a multi-tenant website monitoring SaaS designed specifically
              for web development and digital marketing agencies managing client portfolios.
            </p>

            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Core Workflow</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                1. <strong>Add your clients</strong> under Clients &amp; Portals.<br/>
                2. <strong>Register client URLs</strong> with check intervals from 1-min to 1-hour.<br/>
                3. <strong>Configure email delivery</strong> with your custom agency SMTP or SendGrid API.<br/>
                4. <strong>Investigate incidents</strong> with automatic root-cause diagnosis.<br/>
                5. <strong>Verify repairs</strong> with live probes before sending branded monthly reports.
              </p>
            </div>
          </section>

          <section id="adding-sites" style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>Adding Monitored Websites</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Websites can be added through the <strong>Monitors → Add URL</strong> modal or via our REST API.
              Each website belongs to a specific client company and includes independently configurable check vectors.
            </p>

            <pre style={{ background: '#090d15', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#38bdf8', overflowX: 'auto', marginBottom: '16px' }}>
{`POST /api/v1/organizations/:orgId/sites
Content-Type: application/json

{
  "clientId": "a7612ab8-f673-4ec4-8f5a-96f99539909c",
  "name": "Acme Production Store",
  "url": "https://www.clientwebsite.com/",
  "checkInterval": "1m",
  "checks": {
    "http": true,
    "tls": true,
    "dns": true,
    "redirect": true,
    "headers": true,
    "browser": false
  },
  "runImmediateCheck": true
}`}
            </pre>
          </section>

          <section id="browserguard" style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>BrowserGuard: Synthetic User Journeys</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              BrowserGuard uses headless Chromium to simulate actual visitor transactions. You can test form submissions,
              e-commerce checkout buttons, and gated customer logins.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              On test failure, BrowserGuard captures full-page screenshots with sensitive data automatically redacted
              and records all failed network requests and browser console logs.
            </p>
          </section>

          <section id="ssrf" style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>Zero-Trust SSRF Policy</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              All network requests initiated by SiteReliant workers pass through our kernel socket DNS pinning interceptor.
              Requests to the following ranges are aborted before socket connection:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <li>❌ <strong>RFC 1918 Private IPv4:</strong> 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16</li>
              <li>❌ <strong>Loopback:</strong> 127.0.0.0/8, ::1</li>
              <li>❌ <strong>Cloud Metadata APIs:</strong> 169.254.169.254 (AWS, GCP, Azure, DigitalOcean)</li>
              <li>❌ <strong>Internal TLDs:</strong> .localhost, .local, .internal</li>
            </ul>
          </section>

          <section id="api" style={{ marginBottom: '80px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>REST API Authentication</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              All API requests require an organization context header or session bearer token:
            </p>
            <pre style={{ background: '#090d15', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#10b981', overflowX: 'auto' }}>
{`curl -X GET http://localhost:4000/api/v1/organizations/apex-web/overview \\
  -H "Authorization: Bearer <API_TOKEN>" \\
  -H "Content-Type: application/json"`}
            </pre>
          </section>
        </div>
      </div>

      <footer className="public-footer">
        <div className="footer-bottom" style={{ borderTop: 'none', padding: 0 }}>
          <div>&copy; {new Date().getFullYear()} SiteReliant Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

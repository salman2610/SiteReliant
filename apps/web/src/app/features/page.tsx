'use client';

import React from 'react';
import Link from 'next/link';

export default function FeaturesPage() {
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
          <Link href="/features" className="public-nav-link active">Features</Link>
          <Link href="/pricing" className="public-nav-link">Pricing</Link>
          <Link href="/docs" className="public-nav-link">Docs</Link>
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

      <section className="hero-section" style={{ padding: '60px 24px 40px 24px' }}>
        <div className="hero-badge">Comprehensive Feature Suite</div>
        <h1 className="hero-headline" style={{ fontSize: '46px' }}>Engineered for Agency Reliability</h1>
        <p className="hero-description" style={{ maxWidth: '700px' }}>
          Explore the technical capabilities that separate SiteReliant from basic uptime checkers. From synthetic customer journeys
          to automated incident root-cause diagnosis and verified fix proofs.
        </p>
      </section>

      {/* Feature Deep-Dive Sections */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Synthetic Chromium Browser Testing</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Basic HTTP 200 checks fail to catch broken JavaScript applications, unresponsive forms, or crashed checkout flows.
              SiteReliant BrowserGuard launches headless Chromium sessions that click buttons, fill out test forms, and verify
              expected DOM elements.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ Automated failure screenshot capture with sensitive data redaction</li>
              <li>✓ Console error trace and failed network request telemetry</li>
              <li>✓ Independent scheduling from rapid HTTP probes (every 15–60 min)</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Multi-Protocol Probing</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Monitor every layer of your clients&apos; web infrastructure. Execute checks from 1-minute to 1-hour intervals with custom
              payloads, response size capping, and zero-trust SSRF protection.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ HTTP status codes, latency, and redirect chain loop inspection</li>
              <li>✓ TLS certificate validity, expiration warnings, and cipher strength</li>
              <li>✓ DNS A, MX, NS, and CNAME record deviation detection</li>
              <li>✓ Security header audits (CSP, HSTS, X-Frame-Options, Referrer-Policy)</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Automated Incident Diagnosis</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              When a website goes down, SiteReliant analyzes error codes and HTTP headers to immediately deduce the root cause.
              Instead of guessing, your on-call team gets actionable diagnostic guidance immediately.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ Distinguishes Nginx upstream 502/503 from backend PHP-FPM / Node crash</li>
              <li>✓ Identifies expired certificates vs untrusted intermediate authority</li>
              <li>✓ Flags DNS resolution drops and registrar misconfigurations</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🛡️</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Verified Fix Remediation Workflow</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Closing an incident shouldn&apos;t just be clicking a checkbox. SiteReliant introduces the industry&apos;s first verified
              remediation pipeline: engineers record fix notes, and the system executes a live verification probe.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ Real-time probe confirmation before incident closure</li>
              <li>✓ Cryptographically verifiable MTTR (Mean Time to Resolution) proof</li>
              <li>✓ Remediation log automatically attached to monthly client reports</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🏢</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Agency White-Label Client Portals</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Give your clients read-only access to their own monitored sites, uptime metrics, and reports without exposing your
              internal agency dashboard.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ Custom agency domain such as status.youragency.com</li>
              <li>✓ Customizable agency brand colors, logo, and contact info</li>
              <li>✓ Optional client access key authentication for private status views</li>
            </ul>
          </div>

          <div className="glass-card" style={{ padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Zero-Trust SSRF &amp; Credential Vault</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Built for high-security SaaS environments. Protect your internal network from malicious target URLs and safeguard
              client email secrets.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li>✓ Enforced socket-pinned IP validation against RFC 1918 and metadata APIs</li>
              <li>✓ AES-256-GCM encryption with IV and authentication tags for all credentials</li>
              <li>✓ Masked secrets in UI with strict server-side rotation workflows</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <Link href="/register" className="btn-hero-primary">
            Start Your 14-Day Free Trial
          </Link>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-bottom" style={{ borderTop: 'none', padding: 0 }}>
          <div>&copy; {new Date().getFullYear()} SiteReliant Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/pricing">Pricing</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

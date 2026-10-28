'use client';

import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
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
          <Link href="/pricing" className="public-nav-link active">Pricing</Link>
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
        <div className="hero-badge">Simple Agency Pricing</div>
        <h1 className="hero-headline" style={{ fontSize: '46px' }}>Transparent, Predictable Pricing</h1>
        <p className="hero-description" style={{ maxWidth: '700px' }}>
          No per-client markups or hidden seat surcharges. Choose a plan tailored to your agency&apos;s current website volume,
          with every tier including a full 14-day free trial.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-tier-name">Starter</div>
            <div className="pricing-tier-desc">Perfect for small studios monitoring core client websites.</div>
            <div className="pricing-price">$49</div>
            <div className="pricing-cycle">per agency / month</div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Up to 15 monitored websites
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                5-minute check intervals
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                SSL validity &amp; expiry warnings
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                DNS alteration monitoring
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Custom SMTP or transactional email
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                1 Agency team seat
              </li>
            </ul>

            <Link href="/register?plan=starter" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Start 14-day free trial
            </Link>
          </div>

          <div className="pricing-card featured">
            <div className="pricing-popular-badge">Most Popular</div>
            <div className="pricing-tier-name">Agency Pro</div>
            <div className="pricing-tier-desc">Everything agencies need to run website operations as a retainer service.</div>
            <div className="pricing-price" style={{ color: '#60a5fa' }}>$149</div>
            <div className="pricing-cycle">per agency / month</div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <strong>Up to 50 monitored websites</strong>
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <strong>1-minute check frequency</strong>
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Synthetic browser &amp; transaction journeys
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                White-label client portals (status.youragency.com)
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Custom agency brand logo, palette, and sender headers
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Unlimited agency team seats
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Automated monthly branded SLA client reports
              </li>
            </ul>

            <Link href="/register?plan=pro" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Start 14-day free trial
            </Link>
          </div>

          <div className="pricing-card">
            <div className="pricing-tier-name">Enterprise</div>
            <div className="pricing-tier-desc">For large digital agencies and enterprise website operators.</div>
            <div className="pricing-price">$399</div>
            <div className="pricing-cycle">per agency / month</div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                200+ monitored websites
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                30-second check frequency
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Dedicated egress IPs &amp; proxy pooling
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Custom webhook integrations
              </li>
              <li className="pricing-feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Priority 24/7 SLA &amp; dedicated account engineer
              </li>
            </ul>

            <Link href="/register?plan=enterprise" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              Contact enterprise sales
            </Link>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div style={{ marginTop: '80px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '24px', textAlign: 'center' }}>
            Detailed Tier Comparison
          </h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Starter ($49/mo)</th>
                  <th>Agency Pro ($149/mo)</th>
                  <th>Enterprise ($399/mo)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Website Monitoring Capacity</td>
                  <td>15 sites</td>
                  <td><strong>50 sites</strong></td>
                  <td>200+ sites</td>
                </tr>
                <tr>
                  <td>Fastest Check Interval</td>
                  <td>5 minutes</td>
                  <td><strong>1 minute</strong></td>
                  <td>30 seconds</td>
                </tr>
                <tr>
                  <td>Synthetic Browser Testing</td>
                  <td>—</td>
                  <td><strong>Included (Chromium)</strong></td>
                  <td>Included (Chromium + Mobile)</td>
                </tr>
                <tr>
                  <td>White-Label Client Portals</td>
                  <td>—</td>
                  <td><strong>Included (Unlimited Portals)</strong></td>
                  <td>Included (Custom SSO + Portals)</td>
                </tr>
                <tr>
                  <td>Custom Status Domain</td>
                  <td>—</td>
                  <td><strong>status.youragency.com</strong></td>
                  <td>Multiple Custom Domains</td>
                </tr>
                <tr>
                  <td>Automated Monthly Reports</td>
                  <td>Basic HTML</td>
                  <td><strong>Branded PDF + Auto-Dispatch</strong></td>
                  <td>Custom Templates &amp; Delivery</td>
                </tr>
                <tr>
                  <td>Team Member Seats</td>
                  <td>1 Seat</td>
                  <td><strong>Unlimited Seats</strong></td>
                  <td>Unlimited Seats + RBAC</td>
                </tr>
                <tr>
                  <td>Incident Auto-Diagnosis</td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included + Custom Heuristics</td>
                </tr>
                <tr>
                  <td>Verified Remediation MTTR</td>
                  <td>Included</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-bottom" style={{ borderTop: 'none', padding: 0 }}>
          <div>&copy; {new Date().getFullYear()} SiteReliant Inc. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/features">Features</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

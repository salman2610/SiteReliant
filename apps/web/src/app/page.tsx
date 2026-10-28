'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [simulatedResolved, setSimulatedResolved] = useState(false);

  const roles = [
    'Web Agencies',
    'DevOps Teams',
    'Digital Consultancies',
    'High-Growth Studios'
  ];

  // Animated counters state
  const [counters, setCounters] = useState({
    uptime: 0,
    latency: 0,
    agencies: 0,
    mttr: 0
  });

  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const hiwRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // Dynamic role rotator effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRoleIndex((prev) => (prev + 1) % roles.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [roles.length]);

  // Periodic simulated incident resolution in mockup table
  useEffect(() => {
    const simInterval = setInterval(() => {
      setSimulatedResolved((prev) => !prev);
    }, 4500);
    return () => clearInterval(simInterval);
  }, []);

  // Card mouse spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // GSAP animations and ScrollTrigger
  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Top Viewport Scroll Progress Bar Scrub
      gsap.to('.scroll-progress-line', {
        scaleX: 1,
        transformOrigin: 'left center',
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.15
        }
      });

      // 2. Sticky Nav Frosted Glass Elevation on Scroll
      ScrollTrigger.create({
        start: 'top -40',
        end: 99999,
        onToggle: (self) => {
          const nav = document.querySelector('.public-nav');
          if (nav) {
            if (self.isActive) {
              nav.classList.add('public-nav-scrolled');
            } else {
              nav.classList.remove('public-nav-scrolled');
            }
          }
        }
      });

      // 3. Kinetic Headline Staggered Reveal on Mount
      gsap.fromTo(
        '.kinetic-word',
        { y: 55, opacity: 0, rotate: 2 },
        {
          y: 0,
          opacity: 1,
          rotate: 0,
          duration: 0.85,
          stagger: 0.07,
          ease: 'power3.out',
          delay: 0.15
        }
      );

      // 4. Eyebrow & Description entrance
      gsap.fromTo(
        ['.ref-eyebrow', '.ref-description', '.ref-cta-group', '.ref-trust-row'],
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power2.out', delay: 0.3 }
      );

      // 5. Hero Dashboard 3D Mockup float-in
      gsap.fromTo(
        '.ref-dashboard-window',
        { y: 50, opacity: 0, rotateX: 12, rotateY: -14 },
        {
          y: 0,
          opacity: 1,
          rotateX: 4,
          rotateY: -8,
          duration: 1.2,
          ease: 'power3.out',
          delay: 0.35
        }
      );

      // Floating satellites orbital entrance
      gsap.fromTo(
        ['.ref-float-badge-globe', '.ref-float-badge-cloud', '.ref-float-badge-bell', '.ref-float-incident-card'],
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.7)', delay: 0.7 }
      );

      // 6. HERO SCROLL-TRIGGERED PARALLAX (Apple / Linear 3D Scrub)
      if (heroRef.current) {
        gsap.to('.ref-dashboard-window', {
          y: -70,
          rotateX: 14,
          rotateY: 2,
          scale: 0.94,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.1
          }
        });

        gsap.to('.ref-float-badge-globe', {
          y: -130,
          x: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.85
          }
        });

        gsap.to('.ref-float-badge-cloud', {
          y: -95,
          x: -25,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.95
          }
        });

        gsap.to('.ref-float-badge-bell', {
          y: -115,
          x: 25,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.15
          }
        });

        gsap.to('.ref-float-incident-card', {
          y: -45,
          x: -15,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.2
          }
        });
      }

      // 7. Impact Stats Counter Animation via ScrollTrigger
      if (statsRef.current) {
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            const counterObj = { uptime: 0, latency: 0, agencies: 0, mttr: 0 };
            gsap.to(counterObj, {
              uptime: 99.99,
              latency: 12,
              agencies: 450,
              mttr: 42,
              duration: 2,
              ease: 'power2.out',
              onUpdate: () => {
                setCounters({
                  uptime: parseFloat(counterObj.uptime.toFixed(2)),
                  latency: Math.round(counterObj.latency),
                  agencies: Math.round(counterObj.agencies),
                  mttr: Math.round(counterObj.mttr)
                });
              }
            });
          }
        });
      }

      // 8. Features Grid 3D Tilt Stagger on Scroll
      if (featuresRef.current) {
        gsap.fromTo(
          '.feature-card-anim',
          { y: 65, opacity: 0, rotateX: 16, transformPerspective: 1000 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: featuresRef.current,
              start: 'top 75%'
            }
          }
        );
      }

      // 9. HOW IT WORKS: Step-by-Step Progressive Highlight on Scroll
      const steps = gsap.utils.toArray<HTMLElement>('.ref-hiw-step');
      steps.forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 75%',
          end: 'bottom 45%',
          onEnter: () => step.classList.add('active-step'),
          onLeave: () => step.classList.remove('active-step'),
          onEnterBack: () => step.classList.add('active-step'),
          onLeaveBack: () => step.classList.remove('active-step')
        });
      });

      // Scrubbed World Map Bezier Drawing
      if (hiwRef.current) {
        gsap.to('.scrubbed-map-arc', {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: hiwRef.current,
            start: 'top 70%',
            end: 'center 45%',
            scrub: 1.2
          }
        });
      }

      // 10. Testimonials Section Directional Parallax Entrance
      gsap.fromTo(
        '.testimonial-card-left',
        { x: -70, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.85,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#testimonials',
            start: 'top 75%'
          }
        }
      );
      gsap.fromTo(
        '.testimonial-card-center',
        { y: 70, opacity: 0, scale: 0.94 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#testimonials',
            start: 'top 75%'
          }
        }
      );
      gsap.fromTo(
        '.testimonial-card-right',
        { x: 70, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.85,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#testimonials',
            start: 'top 75%'
          }
        }
      );

      // 11. Pricing Cards Stagger & Pop
      if (pricingRef.current) {
        gsap.fromTo(
          '.pricing-card',
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.14,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: pricingRef.current,
              start: 'top 75%'
            }
          }
        );
      }

      // 12. Security Cards Animated Top Scan Line
      const secCards = gsap.utils.toArray<HTMLElement>('.security-card');
      secCards.forEach((card) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 80%',
          once: true,
          onEnter: () => card.classList.add('active-scan')
        });
      });

      // 13. Final CTA Box Dimensional Spring Zoom
      gsap.fromTo(
        '.final-cta-box',
        { scale: 0.9, opacity: 0, y: 40 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: '.final-cta-box',
            start: 'top 85%'
          }
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="public-site">
      {/* Top Viewport Scroll Progress Bar */}
      <div className="scroll-progress-line" aria-hidden="true" />

      {/* Analog Noise Overlay for tactile texture */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* Top Public Navigation */}
      <header className="public-nav">
        <div className="site-container public-nav-inner">
          <Link href="/" className="public-logo">
            <img
              src="/branding/logo-icon.png"
              alt="SiteReliant"
              style={{ height: '34px', width: '34px', display: 'block', objectFit: 'contain' }}
            />
            <span className="brand-logo-text">
              Site<span className="brand-accent">Reliant</span>
            </span>
          </Link>

          <nav className="public-nav-links">
            <a href="#features" className="public-nav-link">Features</a>
            <a href="#how-it-works" className="public-nav-link">How It Works</a>
            <a href="#testimonials" className="public-nav-link">Agencies</a>
            <a href="#pricing" className="public-nav-link">Pricing</a>
            <a href="#security" className="public-nav-link">Security</a>
          </nav>

          <div className="public-nav-actions">
            <Link href="/login" className="public-nav-link" style={{ color: '#cbd5e1', fontWeight: 600 }}>
              Sign in
            </Link>
            <Link href="/register" className="ref-btn-primary" style={{ padding: '9px 20px', fontSize: '13px' }}>
              Start Free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Kinetic Typography & Parallax Scrub */}
      <section className="ref-hero-wrapper" ref={heroRef}>
        <div className="ref-hero-glow-left"></div>

        <div className="site-container ref-hero-grid">
          {/* Left Hero Column */}
          <div className="ref-hero-left">
            <div className="ref-eyebrow">
              <span className="live-pulse-dot" style={{ marginRight: '4px' }}></span>
              <span>BUILT SPECIFICALLY FOR</span>
              <div className="role-rotator-wrapper">
                <span className="role-rotator-pill">
                  {roles[activeRoleIndex]}
                </span>
              </div>
            </div>

            <h1 className="ref-title kinetic-headline">
              <span className="kinetic-line">
                <span className="kinetic-word">Detect</span>{' '}
                <span className="kinetic-word">issues.</span>
              </span>
              <span className="kinetic-line">
                <span className="kinetic-word">Diagnose</span>{' '}
                <span className="kinetic-word">faster.</span>
              </span>
              <span className="kinetic-line">
                <span className="kinetic-word">Keep</span>{' '}
                <span className="kinetic-word">every</span>{' '}
                <span className="kinetic-word">site</span>{' '}
                <span className="kinetic-word shimmer-text">reliable.</span>
              </span>
            </h1>

            <p className="ref-description">
              SiteReliant continuously monitors client websites, detects failures, runs real browser tests, diagnoses root causes and verifies fixes — with beautiful reports and white-label portals for your clients.
            </p>

            <div className="ref-cta-group">
              <Link href="/register" className="ref-btn-primary">
                Start Free Trial
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
              <a href="#how-it-works" className="ref-btn-secondary">
                View Live Demo
                <span className="ref-play-icon">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4"></polygon>
                  </svg>
                </span>
              </a>
            </div>

            <div className="ref-trust-row">
              <div className="ref-trust-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="ref-trust-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Setup in 2 minutes</span>
              </div>
              <div className="ref-trust-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
                <span>Global probe mesh</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: 3D Mockup with Floating Accents */}
          <div className="ref-hero-right">
            {/* Top Floating Badge: Globe + Worldwide Label */}
            <div className="ref-float-badge-globe">
              <div className="ref-globe-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              </div>
              <div className="ref-globe-label">
                Real-time monitoring, worldwide
              </div>
            </div>

            {/* Left Cloud Float */}
            <div className="ref-float-badge-cloud">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
              </svg>
            </div>

            {/* Right Bell Float */}
            <div className="ref-float-badge-bell">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
              </svg>
            </div>

            {/* Floating Incident Card (Positioned in corner without clipping table columns) */}
            <div className="ref-float-incident-card">
              <div className="ref-incident-icon-box">!</div>
              <div className="ref-incident-info">
                <div className="ref-incident-title">Incident Detected</div>
                <div className="ref-incident-site">api.example.com latency spike</div>
                <div className="ref-incident-time">
                  <span>2 mins ago</span>
                  <span>·</span>
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>Auto-diagnosing</span>
                </div>
              </div>
            </div>

            {/* 3D Dashboard Mockup Window */}
            <div className="ref-dashboard-window">
              {/* Sidebar */}
              <div className="ref-mockup-sidebar">
                <div className="ref-mockup-logo">
                  <img src="/branding/logo-icon.png" alt="SiteReliant" style={{ width: '18px', height: '18px' }} />
                  <span>SiteReliant</span>
                </div>

                <div className="ref-mockup-nav">
                  <div className="ref-mockup-nav-item active">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                    <span>Dashboard</span>
                  </div>
                  <div className="ref-mockup-nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>Websites</span>
                  </div>
                  <div className="ref-mockup-nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>Incidents</span>
                  </div>
                  <div className="ref-mockup-nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>Reports</span>
                  </div>
                  <div className="ref-mockup-nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>Clients</span>
                  </div>
                  <div className="ref-mockup-nav-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Settings</span>
                  </div>
                </div>
              </div>

              {/* Main Workspace Body */}
              <div className="ref-mockup-main">
                {/* Search Bar + User Avatar Row */}
                <div className="ref-mockup-topbar">
                  <div className="ref-mockup-search">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>Search websites...</span>
                  </div>
                  <div className="ref-mockup-userbar">
                    <div style={{ position: 'relative' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                      <span style={{ position: 'absolute', top: '-1px', right: '-1px', width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444' }}></span>
                    </div>
                    <div className="ref-mockup-avatar" title="Salmanul Faris">S</div>
                  </div>
                </div>

                {/* 4 Stat Metric Cards */}
                <div className="ref-mockup-stats">
                  <div className="ref-metric-card">
                    <div className="ref-metric-label">Websites</div>
                    <div className="ref-metric-val">24</div>
                    <div className="ref-metric-badge ref-badge-green">↑ 2 new</div>
                  </div>

                  <div className="ref-metric-card">
                    <div className="ref-metric-label">Uptime</div>
                    <div className="ref-metric-val">99.98%</div>
                    <div className="ref-metric-badge ref-badge-green">↑ 0.02%</div>
                  </div>

                  <div className="ref-metric-card">
                    <div className="ref-metric-label">Incidents</div>
                    <div className="ref-metric-val">3</div>
                    <div className="ref-metric-badge ref-badge-orange">↑ 50%</div>
                  </div>

                  <div className="ref-metric-card">
                    <div className="ref-metric-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Avg. Response</span>
                      <span>▾</span>
                    </div>
                    <div className="ref-metric-val">384 ms</div>
                    <div className="ref-metric-badge ref-badge-green">↓ 32%</div>
                  </div>
                </div>

                {/* Middle Charts: Animated Uptime Wave + Status Donut */}
                <div className="ref-mockup-mid-row">
                  {/* Uptime Overview */}
                  <div className="ref-chart-card">
                    <div className="ref-chart-header">
                      <span className="ref-chart-title">Uptime Overview</span>
                      <span className="ref-chart-filter">Last 24 hours ▾</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', height: '70px', alignItems: 'flex-end', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontSize: '8px', color: '#94a3b8' }}>
                        <span>100%</span>
                        <span>98%</span>
                        <span>96%</span>
                      </div>

                      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                        {/* Animated Live Sparkline */}
                        <svg width="100%" height="100%" viewBox="0 0 240 70" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>

                          {/* Area Fill */}
                          <path
                            d="M 0,35 Q 25,25 50,28 T 100,18 T 150,30 T 200,12 T 240,15 L 240,70 L 0,70 Z"
                            fill="url(#chartGradient)"
                          />

                          {/* Animated Foreground Line */}
                          <path
                            className="sparkline-draw"
                            d="M 0,35 Q 25,25 50,28 T 100,18 T 150,30 T 200,12 T 240,15"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="2.5"
                          />

                          {/* Live pulse dot at chart end */}
                          <circle cx="238" cy="15" r="3.5" fill="#38bdf8" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Status Donut Card */}
                  <div className="ref-chart-card">
                    <div className="ref-chart-header">
                      <span className="ref-chart-title">Site Status</span>
                      <span className="ref-chart-filter">All Sites ▾</span>
                    </div>

                    <div className="ref-donut-wrapper">
                      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth="3.5"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="3.8"
                            strokeDasharray="88, 100"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3.8"
                            strokeDasharray="5, 100"
                            strokeDashoffset="-88"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3.8"
                            strokeDasharray="5, 100"
                            strokeDashoffset="-93"
                          />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>24</span>
                          <span style={{ fontSize: '8px', color: '#64748b' }}>Sites</span>
                        </div>
                      </div>

                      <div className="ref-donut-legend">
                        <div className="ref-legend-item">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                          <span>22 Online</span>
                        </div>
                        <div className="ref-legend-item">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span>
                          <span>1 Degraded</span>
                        </div>
                        <div className="ref-legend-item">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
                          <span>1 Down</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Recent Incidents Table (Columns fully clear, no overlap) */}
                <div className="ref-mockup-table-card">
                  <div className="ref-chart-header" style={{ marginBottom: '6px' }}>
                    <span className="ref-chart-title">Recent Incidents</span>
                    <Link href="/login" style={{ fontSize: '9px', color: '#2563eb', fontWeight: 600 }}>View all</Link>
                  </div>

                  <div className="ref-table-row" style={{ fontWeight: 600, color: '#94a3b8', fontSize: '9px' }}>
                    <div>Site</div>
                    <div>Status</div>
                    <div>Issue</div>
                    <div>Detected</div>
                    <div>Remediation</div>
                  </div>

                  <div className="ref-table-row">
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }}></span>
                      example.com
                    </div>
                    <div>
                      {simulatedResolved ? (
                        <span className="ref-status-pill ref-pill-resolved">● Resolved</span>
                      ) : (
                        <span className="ref-status-pill ref-pill-down">● Down</span>
                      )}
                    </div>
                    <div style={{ color: '#475569' }}>
                      {simulatedResolved ? 'Connection Restored' : 'Connection timeout'}
                    </div>
                    <div style={{ color: '#64748b' }}>2 mins ago</div>
                    <div>
                      {simulatedResolved ? (
                        <span className="sim-verification-badge">✔ Verified (200 OK)</span>
                      ) : (
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>Auto-Verifying...</span>
                      )}
                    </div>
                  </div>

                  <div className="ref-table-row">
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }}></span>
                      shop.example.com
                    </div>
                    <div>
                      <span className="ref-status-pill ref-pill-degraded">● Degraded</span>
                    </div>
                    <div style={{ color: '#475569' }}>High response time</div>
                    <div style={{ color: '#64748b' }}>18 mins ago</div>
                    <div style={{ color: '#64748b' }}>SLA 42 mins</div>
                  </div>

                  <div className="ref-table-row">
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b' }}></span>
                      api.example.com
                    </div>
                    <div>
                      <span className="ref-status-pill ref-pill-resolved">● Resolved</span>
                    </div>
                    <div style={{ color: '#475569' }}>500 Server Error</div>
                    <div style={{ color: '#64748b' }}>1 hour ago</div>
                    <div style={{ color: '#16a34a', fontWeight: 600 }}>Closed · 2m MTTR</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Impact Numbers Strip (Noticeable Social Proof & Reliability Stats) */}
      <section className="impact-stats-strip" ref={statsRef}>
        <div className="site-container">
          <div className="impact-stats-grid">
            <div className="impact-stat-item">
              <div className="impact-stat-number">{counters.uptime}%</div>
              <div className="impact-stat-label">Platform Availability</div>
            </div>
            <div className="impact-stat-item">
              <div className="impact-stat-number">{counters.latency}ms</div>
              <div className="impact-stat-label">Global Probe Latency</div>
            </div>
            <div className="impact-stat-item">
              <div className="impact-stat-number">{counters.agencies}+</div>
              <div className="impact-stat-label">Agencies &amp; DevOps Teams</div>
            </div>
            <div className="impact-stat-item">
              <div className="impact-stat-number">&lt;{counters.mttr}s</div>
              <div className="impact-stat-label">Fix Verification MTTR</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (3 Columns x 2 Rows Grid with 3D Tilt Stagger) */}
      <section id="features" className="landing-section" ref={featuresRef}>
        <div className="site-container">
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag">Powerful Capabilities</div>
            <h2 className="section-title">Everything agencies need to run website operations</h2>
            <p className="section-subtitle" style={{ margin: '0 auto 48px auto' }}>
              SiteReliant combines deep multi-protocol probes, synthetic browser runners, and verified incident recovery
              so your agency can promise 99.9% uptime with complete confidence.
            </p>
          </div>

          <div className="ref-features-grid">
            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3 className="feature-title">Real-Time Global Probes</h3>
              <p className="feature-desc">
                Probe HTTP, HTTPS, TCP, UDP, and DNS every 30 seconds from distributed nodes in North America, Europe, and Asia.
                Never rely on single-point monitoring again.
              </p>
            </div>

            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h3 className="feature-title">Synthetic Browser Testing</h3>
              <p className="feature-desc">
                Emulate real users with headless Chromium journeys. Check shopping carts, checkout funnels, and auth forms with step-by-step
                DOM assertions and screenshot diffing.
              </p>
            </div>

            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h3 className="feature-title">SSL &amp; Domain Expiry Tracking</h3>
              <p className="feature-desc">
                Automated TLS certificate depth validation with 30, 14, and 7-day expiration alerts. Avoid silent renewals failures
                and unexpected site security blocks.
              </p>
            </div>

            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </div>
              <h3 className="feature-title">Root Cause Diagnostics</h3>
              <p className="feature-desc">
                Instant packet-level triage, DNS resolution breakdown, TLS handshake latency graphs, and HTTP response headers
                pinpoint why an outage happened.
              </p>
            </div>

            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/><line x1="12" y1="19" x2="12" y2="19"/></svg>
              </div>
              <h3 className="feature-title">Verified Fix Remediation</h3>
              <p className="feature-desc">
                Engineers log repair actions, and SiteReliant runs an immediate verification probe before resolving the incident,
                giving clients auditable proof of resolved MTTR.
              </p>
            </div>

            <div className="feature-card spotlight-card feature-card-anim" onMouseMove={handleMouseMove}>
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="feature-title">White-Label Client Portals</h3>
              <p className="feature-desc">
                Give every agency client a private, read-only status portal under your own custom domain and branding. Resell monitoring
                as a high-margin monthly retainer service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS Section with Sequential Step Glow & Scrubbed Map Arcs */}
      <section id="how-it-works" className="landing-section alt-bg" ref={hiwRef}>
        <div className="site-container">
          <div className="ref-hiw-container">
            {/* Left Text */}
            <div>
              <div className="ref-hiw-tag">HOW IT WORKS</div>
              <h2 className="ref-hiw-title">From issue to verified fix, in one platform.</h2>
              <p className="ref-hiw-desc">
                SiteReliant combines monitoring, real user testing, diagnostics and verified remediation to keep your websites reliable and your clients informed.
              </p>
              <Link href="/register" className="ref-btn-primary">
                See How It Works
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>

            {/* Center: 4 Steps (Activated Sequentially via ScrollTrigger) */}
            <div className="ref-hiw-steps">
              <div className="ref-hiw-step">
                <div className="ref-hiw-step-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div>
                  <div className="ref-hiw-step-name">01 Monitor</div>
                  <div className="ref-hiw-step-desc">We check client sites from multiple global probe locations around the clock.</div>
                </div>
              </div>

              <div className="ref-hiw-step">
                <div className="ref-hiw-step-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <div className="ref-hiw-step-name">02 Detect</div>
                  <div className="ref-hiw-step-desc">Consecutive verification eliminates false alarms and alerts on-call engineers.</div>
                </div>
              </div>

              <div className="ref-hiw-step">
                <div className="ref-hiw-step-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div>
                  <div className="ref-hiw-step-name">03 Diagnose</div>
                  <div className="ref-hiw-step-desc">Detailed logs, HTTP headers, and root cause hints pinpoint what broke immediately.</div>
                </div>
              </div>

              <div className="ref-hiw-step">
                <div className="ref-hiw-step-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="ref-hiw-step-name">04 Verify</div>
                  <div className="ref-hiw-step-desc">An automated confirmation probe verifies recovery before closing the incident.</div>
                </div>
              </div>
            </div>

            {/* Right: World Map & Ping Card with Scrubbed Bezier Connections */}
            <div className="ref-hiw-map-container">
              {/* World Map Vector Graphic */}
              <svg width="100%" height="240" viewBox="0 0 500 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Continents Outline */}
                <path d="M45 65 Q85 55 115 70 Q145 85 135 115 Q105 135 85 125 Q55 105 45 65 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
                <path d="M95 140 Q120 145 125 175 Q115 215 90 205 Q75 175 95 140 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
                <path d="M215 55 Q255 45 275 65 Q265 85 235 90 Q205 75 215 55 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
                <path d="M225 100 Q265 95 275 135 Q255 175 235 155 Q215 135 225 100 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
                <path d="M295 50 Q415 45 435 85 Q425 125 375 115 Q315 105 295 50 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>
                <path d="M375 155 Q425 150 420 190 Q375 195 375 155 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.2"/>

                {/* Scrubbed ScrollTrigger Arcs */}
                <path className="scrubbed-map-arc" d="M 110 80 Q 180 30, 245 65" fill="none" stroke="#38bdf8" strokeWidth="2.5"/>
                <path className="scrubbed-map-arc" d="M 245 65 Q 320 40, 390 85" fill="none" stroke="#38bdf8" strokeWidth="2.5"/>
                <path className="scrubbed-map-arc" d="M 390 85 Q 410 130, 395 170" fill="none" stroke="#38bdf8" strokeWidth="2.5"/>

                {/* Node Circles with Radar Rings */}
                {/* Node 1: North America (New York) */}
                <circle cx="110" cy="80" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="radar-ping-ring" />
                <circle cx="110" cy="80" r="5" fill="#38bdf8"/>

                {/* Node 2: Europe (London) */}
                <circle cx="245" cy="65" r="14" fill="none" stroke="#10b981" strokeWidth="1.5" className="radar-ping-ring radar-ping-ring-delay-1" />
                <circle cx="245" cy="65" r="5" fill="#10b981"/>

                {/* Node 3: Asia (Singapore) */}
                <circle cx="390" cy="85" r="14" fill="none" stroke="#ef4444" strokeWidth="1.5" className="radar-ping-ring radar-ping-ring-delay-2" />
                <circle cx="390" cy="85" r="5" fill="#ef4444"/>

                {/* Node 4: Oceania (Sydney) */}
                <circle cx="395" cy="170" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="radar-ping-ring" />
                <circle cx="395" cy="170" r="5" fill="#38bdf8"/>
              </svg>

              {/* Online Pill (Over London / Europe) */}
              <div className="ref-map-badge-online">
                <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }}></span>
                Online (99.98%)
              </div>

              {/* Issue Detected Pill (Over Asia, well separated from latency card) */}
              <div className="ref-map-badge-alert">
                <span>!</span>
                Issue Detected
              </div>

              {/* Global Monitoring Latency Card */}
              <div className="ref-global-latency-card">
                <div className="ref-latency-title">Global Monitoring</div>
                <div className="ref-latency-item">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    New York
                  </span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>23 ms</span>
                </div>
                <div className="ref-latency-item">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    London
                  </span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>41 ms</span>
                </div>
                <div className="ref-latency-item">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    Singapore
                  </span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>62 ms</span>
                </div>
                <div className="ref-latency-item">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    Sydney
                  </span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>58 ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials Section (Directional Parallax Entrance) */}
      <section id="testimonials" className="landing-section">
        <div className="site-container">
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag">Proven Agency ROI</div>
            <h2 className="section-title">Built for web agencies managing mission-critical client portfolios</h2>
            <p className="section-subtitle" style={{ margin: '0 auto 48px auto' }}>
              See how modern digital agencies use SiteReliant to turn website maintenance into predictable recurring monthly revenue.
            </p>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card spotlight-card testimonial-card-left" onMouseMove={handleMouseMove}>
              <p className="testimonial-quote">
                &ldquo;SiteReliant turned client monitoring from an unpaid fire drill into a $4,200/month recurring maintenance retainer. Our clients love their private white-label portals.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">MV</div>
                <div>
                  <div className="testimonial-author-name">Marcus Vance</div>
                  <div className="testimonial-author-role">Head of Engineering, Apex Digital</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card spotlight-card testimonial-card-center" onMouseMove={handleMouseMove}>
              <p className="testimonial-quote">
                &ldquo;When a client checkout broke at 2 AM on Black Friday, SiteReliant alerted our on-call dev with the exact failed selector and verified our deployment fix in under 4 minutes.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>ER</div>
                <div>
                  <div className="testimonial-author-name">Elena Rostova</div>
                  <div className="testimonial-author-role">VP Web Operations, CloudCraft</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card spotlight-card testimonial-card-right" onMouseMove={handleMouseMove}>
              <p className="testimonial-quote">
                &ldquo;The branded monthly SLA reports give our agency complete credibility. We no longer argue about uptime — we simply hand over verified cryptographic proof.&rdquo;
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>DC</div>
                <div>
                  <div className="testimonial-author-name">David Chen</div>
                  <div className="testimonial-author-role">Founder, Horizon Interactive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Strict 3-Column Equal-Height Row with Interactive Billing Toggle) */}
      <section id="pricing" className="landing-section alt-bg" ref={pricingRef}>
        <div className="site-container">
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag">Transparent Pricing</div>
            <h2 className="section-title">Plans that scale with your client portfolio</h2>
            <p className="section-subtitle" style={{ margin: '0 auto 24px auto' }}>
              Simple per-agency pricing with no hidden seat fees. Start with a 14-day free trial on any tier.
            </p>

            {/* Interactive Billing Cycle Toggle */}
            <div className="pricing-toggle-container">
              <button
                type="button"
                className={`pricing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly billing
              </button>
              <button
                type="button"
                className={`pricing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual billing
                <span className="pricing-save-badge">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            {/* Starter Plan */}
            <div className="pricing-card spotlight-card" onMouseMove={handleMouseMove}>
              <div className="pricing-tier-name">Starter</div>
              <div className="pricing-tier-desc">Ideal for boutique web agencies managing a growing roster of client sites.</div>
              <div className="pricing-price">
                ${billingCycle === 'annual' ? '39' : '49'}
              </div>
              <div className="pricing-cycle">per agency / month {billingCycle === 'annual' ? '(billed annually)' : ''}</div>

              <ul className="pricing-features-list">
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Up to 15</strong> monitored websites</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>5-minute</strong> check frequency</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>SSL &amp; DNS change tracking</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Email incident notifications</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>30-day incident &amp; latency history</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Standard agency email support</span>
                </li>
              </ul>

              <div className="pricing-btn-wrapper">
                <Link href="/register?plan=starter" className="ref-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Start 14-day trial
                </Link>
              </div>
            </div>

            {/* Agency Pro Plan (Featured with dynamic aura glow) */}
            <div className="pricing-card featured spotlight-card" onMouseMove={handleMouseMove}>
              <div className="pricing-popular-badge">Most Popular</div>
              <div className="pricing-tier-name">Agency Pro</div>
              <div className="pricing-tier-desc">Designed for scaling digital agencies delivering high-margin client SLAs.</div>
              <div className="pricing-price" style={{ color: '#60a5fa' }}>
                ${billingCycle === 'annual' ? '119' : '149'}
              </div>
              <div className="pricing-cycle">per agency / month {billingCycle === 'annual' ? '(billed annually)' : ''}</div>

              <ul className="pricing-features-list">
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Up to 50</strong> monitored websites</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>1-minute</strong> check frequency</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Synthetic browser journeys</strong> &amp; form tests</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>White-label portals</strong> with custom domain</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Custom SMTP &amp; agency branding</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Automated monthly branded SLA reports</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Unlimited team seats &amp; member roles</span>
                </li>
              </ul>

              <div className="pricing-btn-wrapper">
                <Link href="/register?plan=pro" className="ref-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Start 14-day free trial
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card spotlight-card" onMouseMove={handleMouseMove} style={{ background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%)' }}>
              <div className="pricing-tier-name">Enterprise</div>
              <div className="pricing-tier-desc">For large web operations teams managing hundreds of mission-critical sites.</div>
              <div className="pricing-price">
                ${billingCycle === 'annual' ? '319' : '399'}
              </div>
              <div className="pricing-cycle">per agency / month {billingCycle === 'annual' ? '(billed annually)' : ''}</div>

              <ul className="pricing-features-list">
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>200+</strong> monitored websites</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>30-second</strong> check frequency</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Dedicated probe egress IPs &amp; proxy pooling</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Custom webhook &amp; Slack integration</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>99.99% platform availability SLA guarantee</span>
                </li>
                <li className="pricing-feature-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Dedicated support &amp; migration assistance</span>
                </li>
              </ul>

              <div className="pricing-btn-wrapper">
                <Link href="/register?plan=enterprise" className="ref-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Contact enterprise sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Reliability Section (Plain-Language Business Benefits with Top Scan Line) */}
      <section id="security" className="landing-section">
        <div className="site-container">
          <div style={{ textAlign: 'center' }}>
            <div className="section-tag">Enterprise Security</div>
            <h2 className="section-title">Built with Zero-Trust Security Principles</h2>
            <p className="section-subtitle" style={{ margin: '0 auto 48px auto' }}>
              We protect your agency credentials and client network boundaries with strict cryptographic and egress isolation.
            </p>
          </div>

          <div className="security-grid">
            <div className="security-card spotlight-card" onMouseMove={handleMouseMove}>
              <div className="security-card-scan" aria-hidden="true" />
              <h4 className="security-card-title">Zero Outbound Data Leaks</h4>
              <p className="security-card-desc">
                Probes and browser runners execute in isolated egress sandboxes that strictly forbid access to private cloud metadata (169.254.169.254), internal LANs, or non-public agency infrastructure.
              </p>
            </div>

            <div className="security-card spotlight-card" onMouseMove={handleMouseMove}>
              <div className="security-card-scan" aria-hidden="true" />
              <h4 className="security-card-title">Bank-Grade Secret Vault</h4>
              <p className="security-card-desc">
                Client SMTP passwords, API keys, and webhook URLs are encrypted at rest with AES-256-GCM authenticated encryption. Secrets are permanently masked in the UI and never exposed in execution logs.
              </p>
            </div>

            <div className="security-card spotlight-card" onMouseMove={handleMouseMove}>
              <div className="security-card-scan" aria-hidden="true" />
              <h4 className="security-card-title">Tamper-Proof Audit Proof</h4>
              <p className="security-card-desc">
                Every detected outage, automated diagnosis, and engineer remediation is cryptographically timestamped and verified, giving your agency indisputable MTTR proof for client billing reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="landing-section alt-bg" style={{ padding: '90px 0' }}>
        <div className="site-container">
          <div className="final-cta-box spotlight-card" onMouseMove={handleMouseMove}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              Ready to protect your clients&apos; websites?
            </h2>
            <p style={{ fontSize: '16px', color: '#cbd5e1', maxWidth: '620px', margin: '0 auto 36px auto', lineHeight: 1.6 }}>
              Join 450+ web development agencies using SiteReliant to detect outages, verify remediations, and deliver high-margin white-label reports.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Link href="/register" className="ref-btn-primary" style={{ padding: '14px 34px', fontSize: '15px' }}>
                Start 14-day free trial
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link href="/login" className="ref-btn-secondary" style={{ padding: '14px 30px', fontSize: '15px' }}>
                Sign in to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer (Deduplicated Links & Aligned Width) */}
      <footer className="public-footer">
        <div className="footer-inner">
          <div>
            <Link href="/" className="public-logo" style={{ marginBottom: '18px' }}>
              <img
                src="/branding/logo-icon.png"
                alt="SiteReliant"
                style={{ height: '32px', width: '32px', display: 'block', objectFit: 'contain' }}
              />
              <span className="brand-logo-text" style={{ fontSize: '20px' }}>
                Site<span className="brand-accent">Reliant</span>
              </span>
            </Link>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.65, maxWidth: '340px' }}>
              Multi-tenant website operations platform for digital agencies. Detect failures, run real browser tests, and deliver proof of reliability.
            </p>
          </div>

          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#pricing">Agency Pricing</a></li>
              <li><Link href="/browser-monitors">Browser Journey Tests</Link></li>
              <li><Link href="/portal/acme-fintech">Client Portal Demo</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Resources</div>
            <ul className="footer-links">
              <li><Link href="/docs">Documentation</Link></li>
              <li><Link href="/docs#api">API Reference</Link></li>
              <li><Link href="/docs#encryption">Security Whitepaper</Link></li>
              <li><Link href="/login">Operator Sign In</Link></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Security &amp; Legal</div>
            <ul className="footer-links">
              <li><a href="#security">Zero-Trust SSRF Policy</a></li>
              <li><Link href="/docs#encryption">AES-256 Vault</Link></li>
              <li><Link href="/docs">Privacy Policy</Link></li>
              <li><Link href="/docs">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>&copy; {new Date().getFullYear()} SiteReliant Inc. All rights reserved.</div>
          <div className="footer-designer-tag">
            Designed and developed by{' '}
            <a
              href="https://salman2610.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-author-link"
              title="Visit Salmanul Faris's portfolio"
            >
              Salmanul Faris
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-pulse-dot" style={{ width: '8px', height: '8px' }}></span>
            <span style={{ color: '#cbd5e1' }}>All Probe Networks Operational (99.99%)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

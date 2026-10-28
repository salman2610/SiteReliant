import { prisma } from './index.js';

export async function seedDatabase() {
  console.log('🌱 Seeding SiteGuard database...');

  // 1. Organization with White-label Agency Branding
  const org = await prisma.organization.upsert({
    where: { slug: 'apex-web' },
    update: {
      brandLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      brandPrimaryColor: '#0ea5e9',
      brandAccentColor: '#6366f1',
      customDomain: 'status.apexweb.com',
      supportEmail: 'support@apexweb.com',
      portalHeading: 'Client Service Reliability Portal',
      portalSubheading: 'Real-time uptime, SLA performance, and verified incident remediations powered by Apex Web Studio.',
    },
    create: {
      name: 'Apex Web Studio',
      slug: 'apex-web',
      timezone: 'America/New_York',
      plan: 'agency_pro',
      brandLogoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      brandPrimaryColor: '#0ea5e9',
      brandAccentColor: '#6366f1',
      customDomain: 'status.apexweb.com',
      supportEmail: 'support@apexweb.com',
      portalHeading: 'Client Service Reliability Portal',
      portalSubheading: 'Real-time uptime, SLA performance, and verified incident remediations powered by Apex Web Studio.',
    },
  });

  // 2. Users & Memberships
  const ownerUser = await prisma.user.upsert({
    where: { email: 'alex@apexweb.com' },
    update: {},
    create: {
      email: 'alex@apexweb.com',
      name: 'Alex Vance',
      passwordHash: 'argon2_mock_hash_or_dev_secret',
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: ownerUser.id,
      },
    },
    update: { role: 'owner' },
    create: {
      organizationId: org.id,
      userId: ownerUser.id,
      role: 'owner',
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'sarah@apexweb.com' },
    update: {},
    create: {
      email: 'sarah@apexweb.com',
      name: 'Sarah Connor',
      passwordHash: 'argon2_mock_hash_or_dev_secret',
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: operatorUser.id,
      },
    },
    update: { role: 'operator' },
    create: {
      organizationId: org.id,
      userId: operatorUser.id,
      role: 'operator',
    },
  });

  // 3. Clients with Slugs and White-label Portal access
  const client1 = await prisma.client.upsert({
    where: { slug: 'nordic-retail' },
    update: {
      name: 'Nordic Retail Group',
      contactEmail: 'it@nordicretail.com',
      timezone: 'Europe/Stockholm',
      portalAccessKey: 'key_nordic_retail_live',
      portalEnabled: true,
    },
    create: {
      organizationId: org.id,
      name: 'Nordic Retail Group',
      slug: 'nordic-retail',
      contactEmail: 'it@nordicretail.com',
      timezone: 'Europe/Stockholm',
      portalAccessKey: 'key_nordic_retail_live',
      portalEnabled: true,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { slug: 'starlight-health' },
    update: {
      name: 'Starlight Healthcare',
      contactEmail: 'ops@starlighthealth.org',
      timezone: 'America/Chicago',
      portalAccessKey: 'key_starlight_health_live',
      portalEnabled: true,
    },
    create: {
      organizationId: org.id,
      name: 'Starlight Healthcare',
      slug: 'starlight-health',
      contactEmail: 'ops@starlighthealth.org',
      timezone: 'America/Chicago',
      portalAccessKey: 'key_starlight_health_live',
      portalEnabled: true,
    },
  });

  const client3 = await prisma.client.upsert({
    where: { slug: 'acme-fintech' },
    update: {
      name: 'Acme FinTech Systems',
      contactEmail: 'security@acmefintech.io',
      timezone: 'America/New_York',
      portalAccessKey: 'key_acme_fintech_live',
      portalEnabled: true,
    },
    create: {
      organizationId: org.id,
      name: 'Acme FinTech Systems',
      slug: 'acme-fintech',
      contactEmail: 'security@acmefintech.io',
      timezone: 'America/New_York',
      portalAccessKey: 'key_acme_fintech_live',
      portalEnabled: true,
    },
  });

  // 4. Sites
  const site1 = await prisma.site.create({
    data: {
      organizationId: org.id,
      clientId: client1.id,
      name: 'Nordic Retail Storefront',
      url: 'https://store.nordicretail.com',
      normalizedHost: 'store.nordicretail.com',
      status: 'healthy',
      isActive: true,
    },
  });

  const site2 = await prisma.site.create({
    data: {
      organizationId: org.id,
      clientId: client2.id,
      name: 'Patient Portal API',
      url: 'https://api.starlighthealth.org',
      normalizedHost: 'api.starlighthealth.org',
      status: 'degraded',
      isActive: true,
    },
  });

  const site3 = await prisma.site.create({
    data: {
      organizationId: org.id,
      clientId: client3.id,
      name: 'Acme Payments Dashboard',
      url: 'https://pay.acmefintech.io',
      normalizedHost: 'pay.acmefintech.io',
      status: 'down',
      isActive: true,
    },
  });

  // 5. Default Check Policies
  const checkTypes = ['http', 'tls', 'dns', 'redirect', 'headers'] as const;
  const sites = [site1, site2, site3];

  for (const s of sites) {
    for (const ct of checkTypes) {
      await prisma.checkPolicy.create({
        data: {
          organizationId: org.id,
          siteId: s.id,
          checkType: ct,
          intervalSeconds: ct === 'http' ? 300 : ct === 'dns' ? 900 : 21600,
          timeoutMs: 10000,
          failureThreshold: 2,
          recoveryThreshold: 2,
          enabled: true,
        },
      });
    }
  }

  // 6. Check Results (Historical Observations)
  const policies = await prisma.checkPolicy.findMany({ where: { siteId: site1.id } });
  const httpPolicy = policies.find((p) => p.checkType === 'http');

  if (httpPolicy) {
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      await prisma.checkResult.create({
        data: {
          organizationId: org.id,
          siteId: site1.id,
          policyId: httpPolicy.id,
          checkedAt: new Date(now - i * 3600 * 1000),
          success: true,
          resultCode: 'ok',
          httpStatus: 200,
          latencyMs: Math.floor(85 + Math.random() * 40),
          detailsJson: { url: site1.url },
        },
      });
    }
  }

  // 7. Active Incident for Site 3 (Acme Payments)
  const site3HttpPolicy = await prisma.checkPolicy.findFirst({
    where: { siteId: site3.id, checkType: 'http' },
  });

  if (site3HttpPolicy) {
    const incident = await prisma.incident.create({
      data: {
        organizationId: org.id,
        siteId: site3.id,
        checkType: 'http',
        fingerprint: `${site3.id}:http:503`,
        severity: 'critical',
        status: 'open',
        title: 'HTTP 503 Service Unavailable: Gateway Backend Offline',
        openedAt: new Date(Date.now() - 42 * 60 * 1000), // 42 mins ago
        lastSeenAt: new Date(),
      },
    });

    await prisma.incidentEvent.createMany({
      data: [
        {
          organizationId: org.id,
          incidentId: incident.id,
          eventType: 'opened',
          message: 'Incident opened after 2 consecutive failed HTTP health checks (HTTP 503).',
          metadataJson: { httpStatus: 503, latencyMs: 310 },
        },
        {
          organizationId: org.id,
          incidentId: incident.id,
          eventType: 'state_change',
          message: 'Failure confirmed on re-check. Alert notification dispatched.',
          metadataJson: { consecutiveFailures: 2 },
        },
      ],
    });

    // Notification delivery
    await prisma.notificationDelivery.create({
      data: {
        organizationId: org.id,
        incidentId: incident.id,
        eventKey: 'opened',
        recipient: 'security@acmefintech.io',
        providerMessageId: 'postmark_msg_7781a9',
        status: 'sent',
        attemptCount: 1,
        sentAt: new Date(Date.now() - 40 * 60 * 1000),
      },
    });
  }

  // 8. Warning Incident for Site 2 (TLS Cert Expiry Warning)
  const certIncident = await prisma.incident.create({
    data: {
      organizationId: org.id,
      siteId: site2.id,
      checkType: 'tls',
      fingerprint: `${site2.id}:tls:expiry`,
      severity: 'warning',
      status: 'open',
      title: 'TLS Certificate Expiring in 4 Days (Let\'s Encrypt)',
      openedAt: new Date(Date.now() - 6 * 3600 * 1000),
      lastSeenAt: new Date(),
    },
  });

  await prisma.incidentEvent.create({
    data: {
      organizationId: org.id,
      incidentId: certIncident.id,
      eventType: 'opened',
      message: 'Certificate validity expires in 4 days. Automated renewal recommended.',
      metadataJson: { daysRemaining: 4, issuer: "Let's Encrypt Authority X3" },
    },
  });

  // 9. Alert Policies
  await prisma.alertPolicy.createMany({
    data: [
      {
        organizationId: org.id,
        eventType: 'incident_opened',
        channel: 'email',
        recipient: 'alerts@apexweb.com',
        enabled: true,
      },
      {
        organizationId: org.id,
        eventType: 'incident_resolved',
        channel: 'email',
        recipient: 'alerts@apexweb.com',
        enabled: true,
      },
      {
        organizationId: org.id,
        eventType: 'cert_expiry_warning',
        channel: 'email',
        recipient: 'devops@apexweb.com',
        enabled: true,
      },
    ],
  });

  // 10. Branded Monthly Report
  const monthStart = new Date(Date.UTC(2026, 9, 1));
  const monthEnd = new Date(Date.UTC(2026, 9, 30, 23, 59, 59));

  await prisma.report.create({
    data: {
      organizationId: org.id,
      clientId: client1.id,
      periodStart: monthStart,
      periodEnd: monthEnd,
      status: 'ready',
      storageKey: 'reports/apex-web/nordic-retail-2026-10.pdf',
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uptimePercentage: 99.98,
      dataJson: {
        agencyName: 'Apex Web Studio',
        clientName: 'Nordic Retail Group',
        sitesMonitored: 1,
        totalChecks: 8640,
        successfulChecks: 8638,
        incidentCount: 1,
        mttrMinutes: 4.2,
      },
    },
  });

  console.log('✅ Seed completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

import { describe, it, before } from 'node:test';
import * as assert from 'node:assert';
import { prisma } from '@siteguard/database';

describe('Multi-Tenancy Isolation & Cross-Tenant Security Audit', () => {
  const API_BASE = 'http://localhost:4000/api/v1';

  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let clientA: any;
  let clientB: any;
  let siteB: any;
  let incidentB: any;
  let reportB: any;

  before(async () => {
    // Org A
    orgA = await prisma.organization.upsert({
      where: { slug: 'apex-web' },
      update: {},
      create: { name: 'Apex Web Studio', slug: 'apex-web' },
    });
    userA = await prisma.user.findFirst({ where: { email: 'alex@apexweb.com' } });
    clientA = await prisma.client.findFirst({ where: { organizationId: orgA.id } });

    // Org B (Unrelated agency tenant)
    orgB = await prisma.organization.upsert({
      where: { slug: 'beta-agency' },
      update: {},
      create: { name: 'Beta Agency Partners', slug: 'beta-agency' },
    });

    userB = await prisma.user.upsert({
      where: { email: 'charlie@betaagency.com' },
      update: {},
      create: {
        email: 'charlie@betaagency.com',
        name: 'Charlie Davis',
        passwordHash: 'dev_mock_hash',
      },
    });

    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgB.id,
          userId: userB.id,
        },
      },
      update: {},
      create: {
        organizationId: orgB.id,
        userId: userB.id,
        role: 'owner',
      },
    });

    clientB = await prisma.client.create({
      data: {
        organizationId: orgB.id,
        name: 'Beta Confidential Client',
        contactEmail: 'contact@betaclient.org',
      },
    });

    siteB = await prisma.site.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        name: 'Beta Protected Property',
        url: 'https://protected.beta.org',
        normalizedHost: 'protected.beta.org',
        status: 'healthy',
      },
    });

    incidentB = await prisma.incident.create({
      data: {
        organizationId: orgB.id,
        siteId: siteB.id,
        checkType: 'http',
        fingerprint: `${siteB.id}:http:500`,
        severity: 'critical',
        status: 'open',
        title: 'Beta Internal Outage',
      },
    });

    reportB = await prisma.report.create({
      data: {
        organizationId: orgB.id,
        clientId: clientB.id,
        periodStart: new Date(Date.UTC(2026, 9, 1)),
        periodEnd: new Date(Date.UTC(2026, 9, 30)),
        status: 'ready',
        uptimePercentage: 99.5,
        contentHash: 'hash_secret_beta_report',
        dataJson: { secretMetrics: 'confidential' },
      },
    });
  });

  it('rejects cross-tenant access to organization overview with 404/403', async () => {
    // User A authenticating with Bearer header trying to access Org B
    const res = await fetch(`${API_BASE}/organizations/beta-agency/overview`, {
      headers: { Authorization: `Bearer ${userA.email}` },
    });

    assert.strictEqual(
      res.status,
      404,
      `Expected 404 for cross-tenant overview query, got ${res.status}`
    );
  });

  it('rejects cross-tenant listing of clients and sites', async () => {
    const clientsRes = await fetch(`${API_BASE}/organizations/beta-agency/clients`, {
      headers: { Authorization: `Bearer ${userA.email}` },
    });
    assert.strictEqual(clientsRes.status, 404);

    const sitesRes = await fetch(`${API_BASE}/organizations/beta-agency/sites`, {
      headers: { Authorization: `Bearer ${userA.email}` },
    });
    assert.strictEqual(sitesRes.status, 404);
  });

  it('prevents registering a site inside Org A with a client belonging to Org B', async () => {
    const res = await fetch(`${API_BASE}/organizations/apex-web/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.email}`,
      },
      body: JSON.stringify({
        clientId: clientB.id, // Belongs to Org B!
        name: 'Trojan Site',
        url: 'https://example.com',
      }),
    });

    assert.strictEqual(
      res.status,
      404,
      `Expected 404 CLIENT_NOT_FOUND when using another tenant's client ID, got ${res.status}`
    );
    const json = await res.json();
    assert.strictEqual(json.error?.code, 'CLIENT_NOT_FOUND');
  });

  it('rejects cross-tenant incident acknowledge and resolve operations', async () => {
    // User A trying to acknowledge Org B's incident
    const ackRes = await fetch(
      `${API_BASE}/organizations/beta-agency/incidents/${incidentB.id}/acknowledge`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${userA.email}` },
      }
    );
    assert.strictEqual(ackRes.status, 404);

    // User A trying to resolve Org B's incident under Org A endpoint
    const spoofRes = await fetch(
      `${API_BASE}/organizations/apex-web/incidents/${incidentB.id}/resolve`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${userA.email}` },
      }
    );
    assert.strictEqual(spoofRes.status, 404);
  });

  it('prevents cross-tenant report download and preview inspection', async () => {
    // User A trying to view Org B's report under Org B slug
    const resB = await fetch(
      `${API_BASE}/organizations/beta-agency/reports/${reportB.id}/view`,
      {
        headers: { Authorization: `Bearer ${userA.email}` },
      }
    );
    assert.strictEqual(resB.status, 404);

    // User A trying to view Org B's report under Org A slug
    const resSpoof = await fetch(
      `${API_BASE}/organizations/apex-web/reports/${reportB.id}/view`,
      {
        headers: { Authorization: `Bearer ${userA.email}` },
      }
    );
    assert.strictEqual(resSpoof.status, 404);
  });
});

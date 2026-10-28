import { describe, it, before } from 'node:test';
import * as assert from 'node:assert';
import { prisma } from '@siteguard/database';

describe('White-Label Agency Platform & Client Portal Security Audit', () => {
  const API_BASE = 'http://localhost:4000/api/v1';

  let org: any;
  let ownerUser: any;
  let client1: any;
  let client2: any;

  before(async () => {
    org = await prisma.organization.findUnique({
      where: { slug: 'apex-web' },
    });
    ownerUser = await prisma.user.findFirst({
      where: { email: 'alex@apexweb.com' },
    });
    client1 = await prisma.client.findFirst({
      where: { slug: 'nordic-retail' },
      include: { sites: true },
    });
    client2 = await prisma.client.findFirst({
      where: { slug: 'acme-fintech' },
      include: { sites: true },
    });
  });

  it('1. Returns agency white-label branding and strictly isolated client sites', async () => {
    const res = await fetch(`${API_BASE}/portal/nordic-retail`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.ok(body.data, 'Expected body.data');
    assert.strictEqual(body.data.agency.name, 'Apex Web Studio');
    assert.ok(body.data.agency.brandPrimaryColor);
    assert.strictEqual(body.data.client.name, 'Nordic Retail Group');
    assert.strictEqual(body.data.client.slug, 'nordic-retail');

    // Strict isolation: all returned sites must belong to nordic-retail
    for (const site of body.data.sites) {
      assert.strictEqual(site.name.includes('Acme'), false, 'Found Acme site in Nordic portal!');
    }
  });

  it('2. Returns 404 for non-existent client portal', async () => {
    const res = await fetch(`${API_BASE}/portal/unknown-client-slug-999`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.error?.code, 'PORTAL_NOT_FOUND');
  });

  it('3. Denies portal access when portalEnabled is false', async () => {
    // Disable portal for client2
    await prisma.client.update({
      where: { id: client2.id },
      data: { portalEnabled: false },
    });

    const res = await fetch(`${API_BASE}/portal/acme-fintech`);
    assert.strictEqual(res.status, 404);

    // Re-enable portal for client2
    await prisma.client.update({
      where: { id: client2.id },
      data: { portalEnabled: true },
    });

    const resReenabled = await fetch(`${API_BASE}/portal/acme-fintech`);
    assert.strictEqual(resReenabled.status, 200);
  });

  it('4. Rejects invalid access key when portal authentication is enforced', async () => {
    const res = await fetch(`${API_BASE}/portal/nordic-retail?key=wrong_key_xyz`);
    assert.strictEqual(res.status, 401);

    const body = await res.json();
    assert.strictEqual(body.error?.code, 'UNAUTHORIZED_PORTAL_ACCESS');

    // Access with correct key succeeds
    const resValid = await fetch(`${API_BASE}/portal/nordic-retail?key=key_nordic_retail_live`);
    assert.strictEqual(resValid.status, 200);
  });

  it('5. Allows agency owner to update branding and validates hex colors', async () => {
    // Test invalid hex color
    const resInvalid = await fetch(`${API_BASE}/organizations/apex-web/branding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ownerUser.id,
      },
      body: JSON.stringify({ brandPrimaryColor: 'not-a-color' }),
    });
    assert.strictEqual(resInvalid.status, 400);

    // Test valid branding update
    const resValid = await fetch(`${API_BASE}/organizations/apex-web/branding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ownerUser.id,
      },
      body: JSON.stringify({
        brandPrimaryColor: '#0284c7',
        portalHeading: 'Apex Client Operations Command',
      }),
    });
    assert.strictEqual(resValid.status, 200);
    const body = await resValid.json();
    assert.strictEqual(body.data.brandPrimaryColor, '#0284c7');
    assert.strictEqual(body.data.portalHeading, 'Apex Client Operations Command');
  });

  it('6. Prevents custom domain collision across agencies', async () => {
    // Ensure another agency and owner user exist
    const otherOrg = await prisma.organization.upsert({
      where: { slug: 'beta-agency' },
      update: {},
      create: { name: 'Beta Agency', slug: 'beta-agency' },
    });

    const otherUser = await prisma.user.upsert({
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
          organizationId: otherOrg.id,
          userId: otherUser.id,
        },
      },
      update: { role: 'owner' },
      create: {
        organizationId: otherOrg.id,
        userId: otherUser.id,
        role: 'owner',
      },
    });

    // Attempt to take status.apexweb.com (already owned by apex-web) for beta-agency
    const resConflict = await fetch(`${API_BASE}/organizations/beta-agency/branding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': otherUser.id,
      },
      body: JSON.stringify({ customDomain: 'status.apexweb.com' }),
    });
    assert.strictEqual(resConflict.status, 409);
    const conflictBody = await resConflict.json();
    assert.strictEqual(conflictBody.error?.code, 'DOMAIN_CONFLICT');
  });

  it('7. Client portal reports endpoint isolates reports strictly to client', async () => {
    const res = await fetch(`${API_BASE}/portal/nordic-retail/reports`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
    assert.strictEqual(body.data[0].uptimePercentage, 99.98);
  });
});

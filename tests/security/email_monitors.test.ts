import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@siteguard/database';
import { encryptSecret, decryptSecret, maskSecret } from '@siteguard/security';
import { dispatchIncidentNotification } from '../../apps/worker/src/incidentManager.js';

const API_BASE = 'http://localhost:4000/api/v1';

describe('Email Delivery & Automatic URL Monitoring Test Suite', () => {
  it('1. Securely encrypts SMTP credentials with AES-256-GCM and masks secrets in API response', async () => {
    const rawPassword = 'super-secret-smtp-api-token-99!';
    const encrypted = encryptSecret(rawPassword);

    assert.notStrictEqual(encrypted, rawPassword);
    assert.strictEqual(encrypted.split(':').length, 3, 'Payload must follow iv:authTag:ciphertext format');

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, rawPassword, 'Decrypted secret must match original plaintext');

    const masked = maskSecret(encrypted);
    assert.strictEqual(masked, '••••••••••••', 'Masked secret must not leak length or content');

    // Test API update
    const res = await fetch(`${API_BASE}/organizations/apex-web/email-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'smtp',
        smtpHost: 'smtp.mailgun.org',
        smtpPort: 587,
        smtpEncryption: 'tls',
        senderName: 'Apex Security Alerts',
        senderEmail: 'alerts@apexweb.com',
        replyToEmail: 'support@apexweb.com',
        smtpUsername: 'postmaster@apexweb.com',
        smtpPassword: rawPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.maskedPassword, '••••••••••••');
    assert.strictEqual(body.data.hasPassword, true);

    // Verify database record has ciphertext, not raw secret
    const dbRecord = await prisma.emailSetting.findUnique({
      where: { organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2' },
    });
    assert.ok(dbRecord?.smtpPasswordEnc);
    assert.notStrictEqual(dbRecord?.smtpPasswordEnc, rawPassword);
    assert.strictEqual(decryptSecret(dbRecord!.smtpPasswordEnc!), rawPassword);
  });

  it('2. Tests SMTP connection and handles delivery status and error reporting', async () => {
    // 1. Test mock / local engine succeeds
    await fetch(`${API_BASE}/organizations/apex-web/email-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'mock',
        senderName: 'Apex Alerts',
        senderEmail: 'alerts@apexweb.com',
      }),
    });

    const testRes = await fetch(`${API_BASE}/organizations/apex-web/email-settings/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: 'qa-tester@apexweb.com' }),
    });

    assert.strictEqual(testRes.status, 200);
    const testBody = await testRes.json();
    assert.strictEqual(testBody.data.success, true);
    assert.strictEqual(testBody.data.recipient, 'qa-tester@apexweb.com');
  });

  it('3. Registers automatic URL monitor with configurable intervals, check types, and alert rules', async () => {
    const client = await prisma.client.findFirst({
      where: { organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2' },
    });
    assert.ok(client);

    const res = await fetch(`${API_BASE}/organizations/apex-web/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        name: 'Scheduled Monitor Test Target',
        url: 'https://example.com',
        checkInterval: '1m',
        emailAlertMode: 'failure_recovery',
        checks: {
          http: true,
          tls: true,
          dns: true,
          redirects: true,
          securityHeaders: true,
          browser: true,
        },
        runImmediateCheck: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.id);

    // Verify policies created with 60 second interval
    const policies = await prisma.checkPolicy.findMany({
      where: { siteId: body.data.id },
    });
    const httpPolicy = policies.find((p) => p.checkType === 'http');
    assert.strictEqual(httpPolicy?.intervalSeconds, 60);

    // Verify browser monitor created
    const browserMon = await prisma.browserMonitor.findFirst({
      where: { siteId: body.data.id },
    });
    assert.ok(browserMon, 'Synthetic browser monitor must be provisioned when browser check enabled');
    assert.strictEqual(browserMon.enabled, true);

    // Verify email alert mode saved on site
    const siteInDb = await prisma.site.findUnique({
      where: { id: body.data.id },
    });
    assert.strictEqual(siteInDb?.emailAlertMode, 'failure_recovery');
  });

  it('4. Respects emailAlertMode === "none" and suppresses outbound notifications', async () => {
    const client = await prisma.client.findFirst({
      where: { organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2' },
    });

    // Create site with email alerts disabled
    const site = await prisma.site.create({
      data: {
        organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2',
        clientId: client!.id,
        name: 'Silent Monitor Site',
        url: 'https://silent-test.org',
        normalizedHost: 'silent-test.org',
        emailAlertMode: 'none',
      },
    });

    const incident = await prisma.incident.create({
      data: {
        organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2',
        siteId: site.id,
        checkType: 'http',
        fingerprint: 'silent-test-incident',
        title: 'Silent Incident That Should Not Send Email',
        severity: 'critical',
        status: 'open',
      },
    });

    const deliveriesBefore = await prisma.notificationDelivery.count({
      where: { incidentId: incident.id },
    });

    await dispatchIncidentNotification({
      organizationId: 'f74fb97a-c1f2-448e-893c-cf6a7747e7b2',
      incidentId: incident.id,
      eventKey: 'opened',
      siteName: site.name,
      siteUrl: site.url,
      clientName: client!.name,
      agencyName: 'Apex Web Studio',
      title: incident.title,
      details: 'Failure details',
      eventType: 'opened',
    });

    const deliveriesAfter = await prisma.notificationDelivery.count({
      where: { incidentId: incident.id },
    });

    assert.strictEqual(deliveriesBefore, deliveriesAfter, 'Notification delivery must not be created when emailAlertMode is none');
  });

  it('5. Audit log records notification dispatches and attempt tracking', async () => {
    const res = await fetch(`${API_BASE}/organizations/apex-web/notification-deliveries`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    const item = body.data[0];
    assert.ok(item.id);
    assert.ok(item.recipient);
    assert.ok(item.status);
    assert.ok(typeof item.attemptCount === 'number');
  });
});

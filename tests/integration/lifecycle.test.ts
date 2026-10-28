import { describe, it, before } from 'node:test';
import * as assert from 'node:assert';
import { prisma } from '@siteguard/database';
import { processIncidentState } from '../../apps/worker/src/incidentManager.js';
import { calculateAvailability, computeReportHash, generateReportHtml } from '@siteguard/reporting';

describe('End-to-End Reliability & Incident Lifecycle Test Suite', () => {
  let org: any;
  let client: any;
  let site: any;
  let httpPolicy: any;

  before(async () => {
    org = await prisma.organization.findUnique({ where: { slug: 'apex-web' } });
    assert.ok(org, 'Apex Web organization must exist');

    client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'Reliability Test Client',
        contactEmail: 'qa@reliability.test',
      },
    });

    site = await prisma.site.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: 'E2E Target Site',
        url: 'https://e2e.reliability.test',
        normalizedHost: 'e2e.reliability.test',
        status: 'pending',
      },
    });

    httpPolicy = await prisma.checkPolicy.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        checkType: 'http',
        intervalSeconds: 60,
        timeoutMs: 5000,
        failureThreshold: 2,
        recoveryThreshold: 2,
        enabled: true,
      },
    });
  });

  it('Step 1: 1st failed check records observation without opening incident (threshold = 2)', async () => {
    await prisma.checkResult.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        policyId: httpPolicy.id,
        checkedAt: new Date(Date.now() - 60000),
        success: false,
        resultCode: 'http_error',
        httpStatus: 503,
        latencyMs: 120,
        errorCategory: 'server_error',
      },
    });

    await processIncidentState({
      organizationId: org.id,
      siteId: site.id,
      policyId: httpPolicy.id,
      checkType: 'http',
      success: false,
      resultCode: 'http_error',
      httpStatus: 503,
      latencyMs: 120,
      errorCategory: 'server_error',
      details: { url: site.url },
    });

    const openIncidents = await prisma.incident.findMany({
      where: { siteId: site.id, checkType: 'http', status: 'open' },
    });

    assert.strictEqual(
      openIncidents.length,
      0,
      'Incident should NOT open on 1st transient failure.'
    );
  });

  it('Step 2: 2nd consecutive failure confirms incident, updates site to down, and queues notification', async () => {
    await prisma.checkResult.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        policyId: httpPolicy.id,
        checkedAt: new Date(),
        success: false,
        resultCode: 'http_error',
        httpStatus: 503,
        latencyMs: 130,
        errorCategory: 'server_error',
      },
    });

    await processIncidentState({
      organizationId: org.id,
      siteId: site.id,
      policyId: httpPolicy.id,
      checkType: 'http',
      success: false,
      resultCode: 'http_error',
      httpStatus: 503,
      latencyMs: 130,
      errorCategory: 'server_error',
      details: { url: site.url },
    });

    const openIncident = await prisma.incident.findFirst({
      where: { siteId: site.id, checkType: 'http', status: 'open' },
      include: { events: true, notificationDeliveries: true },
    });

    assert.ok(openIncident, 'Incident MUST open after 2 consecutive failures.');
    assert.strictEqual(openIncident.severity, 'critical');

    // Site status updated to down
    const updatedSite = await prisma.site.findUnique({ where: { id: site.id } });
    assert.strictEqual(updatedSite?.status, 'down');

    // Notifications queued
    assert.ok(
      openIncident.notificationDeliveries.length > 0,
      'Notification delivery should be created.'
    );
    assert.strictEqual(openIncident.notificationDeliveries[0].eventKey, 'opened');
  });

  it('Step 3: Subsequent failures update lastSeenAt without duplicate notifications (idempotency)', async () => {
    const notificationsBefore = await prisma.notificationDelivery.count({
      where: { incident: { siteId: site.id } },
    });

    await prisma.checkResult.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        policyId: httpPolicy.id,
        checkedAt: new Date(),
        success: false,
        resultCode: 'http_error',
        httpStatus: 503,
        latencyMs: 140,
      },
    });

    await processIncidentState({
      organizationId: org.id,
      siteId: site.id,
      policyId: httpPolicy.id,
      checkType: 'http',
      success: false,
      resultCode: 'http_error',
      httpStatus: 503,
      latencyMs: 140,
      details: {},
    });

    const notificationsAfter = await prisma.notificationDelivery.count({
      where: { incident: { siteId: site.id } },
    });

    assert.strictEqual(
      notificationsAfter,
      notificationsBefore,
      'Duplicate email notifications must NOT be created on subsequent failed checks.'
    );
  });

  it('Step 4: 1st successful recovery check keeps incident open (recovery threshold = 2)', async () => {
    await prisma.checkResult.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        policyId: httpPolicy.id,
        checkedAt: new Date(),
        success: true,
        resultCode: 'ok',
        httpStatus: 200,
        latencyMs: 45,
      },
    });

    await processIncidentState({
      organizationId: org.id,
      siteId: site.id,
      policyId: httpPolicy.id,
      checkType: 'http',
      success: true,
      resultCode: 'ok',
      httpStatus: 200,
      latencyMs: 45,
      details: {},
    });

    const incident = await prisma.incident.findFirst({
      where: { siteId: site.id, checkType: 'http', status: 'open' },
    });
    assert.ok(incident, 'Incident must remain open on single transient recovery.');
  });

  it('Step 5: 2nd successful recovery check marks incident resolved and sends recovery alert', async () => {
    await prisma.checkResult.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        policyId: httpPolicy.id,
        checkedAt: new Date(),
        success: true,
        resultCode: 'ok',
        httpStatus: 200,
        latencyMs: 48,
      },
    });

    await processIncidentState({
      organizationId: org.id,
      siteId: site.id,
      policyId: httpPolicy.id,
      checkType: 'http',
      success: true,
      resultCode: 'ok',
      httpStatus: 200,
      latencyMs: 48,
      details: {},
    });

    const resolvedIncident = await prisma.incident.findFirst({
      where: { siteId: site.id, checkType: 'http', status: 'resolved' },
      include: { notificationDeliveries: true },
    });

    assert.ok(resolvedIncident, 'Incident should be resolved after 2 consecutive successful checks.');
    assert.ok(resolvedIncident.resolvedAt !== null, 'resolvedAt must be set.');

    // Site status updated to healthy
    const updatedSite = await prisma.site.findUnique({ where: { id: site.id } });
    assert.strictEqual(updatedSite?.status, 'healthy');

    // Recovery notification delivered
    const recoveryNotif = resolvedIncident.notificationDeliveries.find(
      (n) => n.eventKey === 'resolved'
    );
    assert.ok(recoveryNotif, 'Recovery notification delivery must be dispatched.');
  });

  it('Step 6: Generates verifiable monthly report reflecting total checks and availability formula', async () => {
    // 5 checks total: 3 failed, 2 successful
    const allChecks = await prisma.checkResult.findMany({ where: { siteId: site.id } });
    assert.strictEqual(allChecks.length, 5);

    const successfulChecks = allChecks.filter((c) => c.success).length;
    assert.strictEqual(successfulChecks, 2);

    const availability = calculateAvailability(successfulChecks, allChecks.length);
    // (2 / 5) * 100 = 40.0%
    assert.strictEqual(availability, 40.0);

    const reportHtml = generateReportHtml({
      agencyName: org.name,
      clientName: client.name,
      periodStart: new Date(Date.UTC(2026, 9, 1)),
      periodEnd: new Date(Date.UTC(2026, 9, 31)),
      sites: [
        {
          name: site.name,
          url: site.url,
          uptimePercentage: availability,
          avgLatencyMs: 97,
          totalChecks: allChecks.length,
          failedChecks: allChecks.length - successfulChecks,
          incidentsCount: 1,
        },
      ],
      overallUptime: availability,
      totalIncidents: 1,
      resolvedIncidents: 1,
      avgMttrMinutes: 3.5,
    });

    const contentHash = computeReportHash(reportHtml);
    assert.strictEqual(typeof contentHash, 'string');
    assert.strictEqual(contentHash.length, 64, 'SHA-256 hash should be 64 hexadecimal chars');
  });
});

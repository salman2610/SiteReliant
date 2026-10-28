import { prisma } from '@siteguard/database';
import { renderIncidentEmail, NotificationDeliveryService } from '@siteguard/notifications';
import { analyzeIncidentDiagnostic } from '@siteguard/monitoring';
import type { CheckType, ResultCode } from '@siteguard/shared';

const emailService = new NotificationDeliveryService();

export async function processIncidentState(params: {
  organizationId: string;
  siteId: string;
  policyId: string;
  checkType: CheckType;
  success: boolean;
  resultCode: ResultCode;
  httpStatus?: number | null;
  latencyMs: number;
  errorCategory?: string | null;
  details: any;
}) {
  const { organizationId, siteId, checkType, success, resultCode, errorCategory } = params;

  // Retrieve last 5 check results for this policy
  const recentResults = await prisma.checkResult.findMany({
    where: { siteId, policyId: params.policyId },
    orderBy: { checkedAt: 'desc' },
    take: 5,
  });

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { client: true, organization: true },
  });
  if (!site) return;

  const fingerprint = `${siteId}:${checkType}`;

  // Find existing open or acknowledged incident
  const openIncident = await prisma.incident.findFirst({
    where: {
      siteId,
      checkType,
      status: { in: ['open', 'acknowledged'] },
    },
  });

  if (!success) {
    // Check failure threshold: 2 consecutive failures
    const consecutiveFailures = recentResults.slice(0, 2).filter((r) => !r.success).length;

    if (consecutiveFailures >= 2 && !openIncident) {
      // OPEN NEW INCIDENT
      const severity = checkType === 'http' ? 'critical' : checkType === 'tls' ? 'warning' : 'info';
      const title =
        checkType === 'http'
          ? `HTTP Failure: ${params.httpStatus ? `Status ${params.httpStatus}` : errorCategory || 'Downtime Detected'}`
          : checkType === 'tls'
          ? `TLS Certificate Error: ${errorCategory || 'Invalid / Expired'}`
          : `${checkType.toUpperCase()} Error: ${errorCategory || 'Check Failed'}`;

      // Automated Root Cause Diagnostic Analysis
      const diagnostic = analyzeIncidentDiagnostic({
        checkType,
        resultCode,
        httpStatus: params.httpStatus,
        errorCategory,
        latencyMs: params.latencyMs,
        details: params.details,
      });

      const incident = await prisma.incident.create({
        data: {
          organizationId,
          siteId,
          checkType,
          fingerprint,
          severity,
          status: 'open',
          title,
          likelyCause: diagnostic.likelyCause,
          rootCauseCategory: diagnostic.rootCauseCategory,
          recommendedFix: diagnostic.recommendedFix,
          openedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      await prisma.incidentEvent.create({
        data: {
          organizationId,
          incidentId: incident.id,
          eventType: 'opened',
          message: `Downtime incident opened after ${consecutiveFailures} consecutive failed checks. Error: ${errorCategory || resultCode}.`,
          metadataJson: {
            resultCode,
            httpStatus: params.httpStatus,
            latencyMs: params.latencyMs,
            details: params.details,
          },
        },
      });

      // Update site status
      await prisma.site.update({
        where: { id: siteId },
        data: { status: checkType === 'http' ? 'down' : 'degraded' },
      });

      // Queue and dispatch notification with idempotency
      await dispatchIncidentNotification({
        organizationId,
        incidentId: incident.id,
        eventKey: 'opened',
        siteName: site.name,
        siteUrl: site.url,
        clientName: site.client.name,
        agencyName: site.organization.name,
        title,
        details: `Reason: ${errorCategory || resultCode} | Latency: ${params.latencyMs}ms | URL: ${site.url}`,
        eventType: 'opened',
      });
    } else if (openIncident) {
      // Update last seen
      await prisma.incident.update({
        where: { id: openIncident.id },
        data: { lastSeenAt: new Date() },
      });
    }
  } else {
    // Successful check
    if (openIncident) {
      // Check recovery threshold: 2 consecutive successes
      const consecutiveSuccesses = recentResults.slice(0, 2).filter((r) => r.success).length;

      if (consecutiveSuccesses >= 2) {
        // RESOLVE INCIDENT
        await prisma.incident.update({
          where: { id: openIncident.id },
          data: {
            status: 'resolved',
            resolvedAt: new Date(),
          },
        });

        await prisma.incidentEvent.create({
          data: {
            organizationId,
            incidentId: openIncident.id,
            eventType: 'resolved',
            message: `Incident resolved after ${consecutiveSuccesses} consecutive successful checks. Service recovered.`,
            metadataJson: { latencyMs: params.latencyMs },
          },
        });

        // Check if all other incidents on this site are resolved
        const activeIncidentsRemaining = await prisma.incident.count({
          where: { siteId, status: { in: ['open', 'acknowledged'] } },
        });

        if (activeIncidentsRemaining === 0) {
          await prisma.site.update({
            where: { id: siteId },
            data: { status: 'healthy' },
          });
        }

        // Send recovery notification
        await dispatchIncidentNotification({
          organizationId,
          incidentId: openIncident.id,
          eventKey: 'resolved',
          siteName: site.name,
          siteUrl: site.url,
          clientName: site.client.name,
          agencyName: site.organization.name,
          title: `RESOLVED: ${openIncident.title}`,
          details: `Service recovered and responding normally (Latency: ${params.latencyMs}ms).`,
          eventType: 'resolved',
        });
      }
    }
  }
}

export async function dispatchIncidentNotification(params: {
  organizationId: string;
  incidentId: string;
  eventKey: 'opened' | 'resolved' | 'warning';
  siteName: string;
  siteUrl: string;
  clientName: string;
  agencyName: string;
  title: string;
  details: string;
  eventType: 'opened' | 'resolved' | 'warning';
}) {
  const inc = await prisma.incident.findUnique({
    where: { id: params.incidentId },
    include: { site: true },
  });

  if (inc?.site?.emailAlertMode === 'none') {
    return; // Email alerts suppressed for this site
  }

  const alertPolicies = await prisma.alertPolicy.findMany({
    where: { organizationId: params.organizationId, enabled: true },
  });

  const recipients = alertPolicies.map((p) => p.recipient);
  // Default fallback if no alert policy configured
  if (recipients.length === 0) {
    recipients.push('alerts@agency.internal');
  }

  // Retrieve agency email settings
  const setting = await prisma.emailSetting.findUnique({
    where: { organizationId: params.organizationId },
  });

  let transportConfig: any;
  if (setting) {
    const { decryptSecret } = await import('@siteguard/security');
    transportConfig = {
      provider: setting.provider,
      smtpHost: setting.smtpHost,
      smtpPort: setting.smtpPort,
      smtpEncryption: setting.smtpEncryption,
      senderName: setting.senderName,
      senderEmail: setting.senderEmail,
      replyToEmail: setting.replyToEmail,
      smtpUsername: setting.smtpUsername,
      smtpPassword: setting.smtpPasswordEnc ? decryptSecret(setting.smtpPasswordEnc) : undefined,
      apiKey: setting.apiKeyEnc ? decryptSecret(setting.apiKeyEnc) : undefined,
    };
  }

  for (const recipient of recipients) {
    // Idempotency check: don't send duplicate emails for the same incident + eventKey + recipient
    const existing = await prisma.notificationDelivery.findUnique({
      where: {
        incidentId_eventKey_recipient: {
          incidentId: params.incidentId,
          eventKey: params.eventKey,
          recipient,
        },
      },
    });

    if (existing && existing.status === 'sent') {
      continue;
    }

    const { subject, text, html } = renderIncidentEmail({
      agencyName: params.agencyName,
      clientName: params.clientName,
      siteName: params.siteName,
      siteUrl: params.siteUrl,
      eventType: params.eventType,
      title: params.title,
      details: params.details,
      timestamp: new Date(),
      dashboardUrl: `http://localhost:3000/incidents/${params.incidentId}`,
    });

    const delivery = await prisma.notificationDelivery.upsert({
      where: {
        incidentId_eventKey_recipient: {
          incidentId: params.incidentId,
          eventKey: params.eventKey,
          recipient,
        },
      },
      update: {
        attemptCount: { increment: 1 },
      },
      create: {
        organizationId: params.organizationId,
        incidentId: params.incidentId,
        eventKey: params.eventKey,
        recipient,
        status: 'pending',
        attemptCount: 1,
      },
    });

    const sendRes = await emailService.sendEmail(recipient, subject, text, html, transportConfig);

    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: sendRes.success ? 'sent' : 'failed',
        providerMessageId: sendRes.messageId || null,
        lastError: sendRes.error || null,
        sentAt: sendRes.success ? new Date() : null,
      },
    });
  }
}

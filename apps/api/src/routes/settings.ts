import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';
import {
  AlertPolicySchema,
  AgencyBrandingUpdateSchema,
  EmailSettingUpdateSchema,
  EmailTestSchema,
} from '@siteguard/shared';
import { encryptSecret, decryptSecret, maskSecret } from '@siteguard/security';
import { NotificationDeliveryService } from '@siteguard/notifications';
import { authenticateAndAuthorize } from '../auth.js';

const emailService = new NotificationDeliveryService();

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Current user & organizations
  app.get('/api/v1/me', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    return reply.send({
      data: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        organizations: user!.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          plan: m.organization.plan,
        })),
      },
    });
  });

  // Accessible organizations
  app.get('/api/v1/organizations', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { memberships: { include: { organization: true } } },
    });

    return reply.send({
      data: user!.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        plan: m.organization.plan,
        timezone: m.organization.timezone,
      })),
    });
  });

  // Alert policies
  app.get('/api/v1/organizations/:orgId/alert-policies', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;

    const policies = await prisma.alertPolicy.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: policies });
  });

  app.post('/api/v1/organizations/:orgId/alert-policies', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;

    const parse = AlertPolicySchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid alert policy data', issues: parse.error.issues },
      });
    }

    const created = await prisma.alertPolicy.create({
      data: {
        organizationId: orgId,
        eventType: parse.data.eventType,
        channel: parse.data.channel,
        recipient: parse.data.recipient,
        enabled: parse.data.enabled,
        settingsJson: parse.data.settingsJson || {},
      },
    });

    return reply.status(201).send({ data: created });
  });

  app.delete('/api/v1/organizations/:orgId/alert-policies/:policyId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;
    const { policyId } = req.params as { policyId: string };

    await prisma.alertPolicy.deleteMany({
      where: { id: policyId, organizationId: orgId },
    });

    return reply.send({ message: 'Alert policy deleted' });
  });

  // Members
  app.get('/api/v1/organizations/:orgId/members', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;

    const members = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    });
  });

  // Invite member
  app.post('/api/v1/organizations/:orgId/members', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;
    const { email, role = 'operator' } = req.body as { email: string; role?: string };

    if (!email || !email.includes('@')) {
      return reply.status(400).send({
        error: { code: 'INVALID_EMAIL', message: 'A valid email is required to invite a member.' },
      });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
        },
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });

    if (existingMembership) {
      return reply.status(409).send({
        error: { code: 'MEMBER_EXISTS', message: 'User is already a member of this agency.' },
      });
    }

    const membership = await prisma.membership.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role,
      },
    });

    return reply.status(201).send({
      data: {
        id: membership.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
      },
    });
  });

  // White-label branding
  app.get('/api/v1/organizations/:orgId/branding', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const org = await prisma.organization.findUnique({
      where: { id: req.organization!.id },
    });

    return reply.send({
      data: {
        name: org?.name,
        slug: org?.slug,
        brandLogoUrl: org?.brandLogoUrl,
        brandPrimaryColor: org?.brandPrimaryColor,
        brandAccentColor: org?.brandAccentColor,
        customDomain: org?.customDomain,
        supportEmail: org?.supportEmail,
        portalHeading: org?.portalHeading,
        portalSubheading: org?.portalSubheading,
      },
    });
  });

  const handleBrandingUpdate = async (req: any, reply: any) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;

    const parse = AgencyBrandingUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid branding configuration', issues: parse.error.issues },
      });
    }

    if (parse.data.customDomain) {
      const existingDomain = await prisma.organization.findFirst({
        where: {
          customDomain: parse.data.customDomain,
          NOT: { id: orgId },
        },
      });

      if (existingDomain) {
        return reply.status(409).send({
          error: { code: 'DOMAIN_CONFLICT', message: 'This custom domain is already bound to another agency.' },
        });
      }
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(parse.data.name !== undefined && { name: parse.data.name }),
        ...(parse.data.brandLogoUrl !== undefined && { brandLogoUrl: parse.data.brandLogoUrl }),
        ...(parse.data.brandPrimaryColor !== undefined && { brandPrimaryColor: parse.data.brandPrimaryColor }),
        ...(parse.data.brandAccentColor !== undefined && { brandAccentColor: parse.data.brandAccentColor }),
        ...(parse.data.customDomain !== undefined && { customDomain: parse.data.customDomain }),
        ...(parse.data.supportEmail !== undefined && { supportEmail: parse.data.supportEmail }),
        ...(parse.data.portalHeading !== undefined && { portalHeading: parse.data.portalHeading }),
        ...(parse.data.portalSubheading !== undefined && { portalSubheading: parse.data.portalSubheading }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        brandLogoUrl: true,
        brandPrimaryColor: true,
        brandAccentColor: true,
        customDomain: true,
        supportEmail: true,
        portalHeading: true,
        portalSubheading: true,
      },
    });

    return reply.send({ data: updated });
  };

  app.put('/api/v1/organizations/:orgId/branding', handleBrandingUpdate);
  app.patch('/api/v1/organizations/:orgId/branding', handleBrandingUpdate);

  // ==========================================
  // Email & Notification Settings
  // ==========================================

  // Get Email / SMTP configuration (with secrets masked)
  app.get('/api/v1/organizations/:orgId/email-settings', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;

    const setting = await prisma.emailSetting.findUnique({
      where: { organizationId: orgId },
    });

    if (!setting) {
      return reply.send({
        data: {
          provider: 'smtp',
          smtpHost: '',
          smtpPort: 587,
          smtpEncryption: 'tls',
          senderName: 'SiteGuard Alerts',
          senderEmail: 'alerts@siteguard.io',
          replyToEmail: '',
          smtpUsername: '',
          hasPassword: false,
          hasApiKey: false,
          maskedPassword: '',
          maskedApiKey: '',
          status: 'untested',
          lastTestedAt: null,
          lastError: null,
        },
      });
    }

    return reply.send({
      data: {
        id: setting.id,
        provider: setting.provider,
        smtpHost: setting.smtpHost || '',
        smtpPort: setting.smtpPort,
        smtpEncryption: setting.smtpEncryption,
        senderName: setting.senderName,
        senderEmail: setting.senderEmail,
        replyToEmail: setting.replyToEmail || '',
        smtpUsername: setting.smtpUsername || '',
        hasPassword: !!setting.smtpPasswordEnc,
        hasApiKey: !!setting.apiKeyEnc,
        maskedPassword: maskSecret(setting.smtpPasswordEnc),
        maskedApiKey: maskSecret(setting.apiKeyEnc),
        status: setting.status,
        lastTestedAt: setting.lastTestedAt,
        lastError: setting.lastError,
      },
    });
  });

  // Save / Rotate Email & SMTP credentials
  app.put('/api/v1/organizations/:orgId/email-settings', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;

    const parse = EmailSettingUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid email configuration payload', issues: parse.error.issues },
      });
    }

    const {
      provider,
      smtpHost,
      smtpPort,
      smtpEncryption,
      senderName,
      senderEmail,
      replyToEmail,
      smtpUsername,
      smtpPassword,
      apiKey,
    } = parse.data;

    const existing = await prisma.emailSetting.findUnique({
      where: { organizationId: orgId },
    });

    let newPasswordEnc = existing?.smtpPasswordEnc || null;
    if (smtpPassword && !smtpPassword.startsWith('••')) {
      newPasswordEnc = encryptSecret(smtpPassword);
    }

    let newApiKeyEnc = existing?.apiKeyEnc || null;
    if (apiKey && !apiKey.startsWith('••')) {
      newApiKeyEnc = encryptSecret(apiKey);
    }

    const saved = await prisma.emailSetting.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        provider,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort || 587,
        smtpEncryption: smtpEncryption || 'tls',
        senderName: senderName || 'SiteGuard Alerts',
        senderEmail,
        replyToEmail: replyToEmail || null,
        smtpUsername: smtpUsername || null,
        smtpPasswordEnc: newPasswordEnc,
        apiKeyEnc: newApiKeyEnc,
        status: 'untested',
      },
      update: {
        provider,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort || 587,
        smtpEncryption: smtpEncryption || 'tls',
        senderName: senderName || 'SiteGuard Alerts',
        senderEmail,
        replyToEmail: replyToEmail || null,
        smtpUsername: smtpUsername || null,
        smtpPasswordEnc: newPasswordEnc,
        apiKeyEnc: newApiKeyEnc,
      },
    });

    return reply.send({
      message: 'Email delivery credentials securely saved and encrypted.',
      data: {
        provider: saved.provider,
        smtpHost: saved.smtpHost,
        smtpPort: saved.smtpPort,
        smtpEncryption: saved.smtpEncryption,
        senderName: saved.senderName,
        senderEmail: saved.senderEmail,
        replyToEmail: saved.replyToEmail,
        smtpUsername: saved.smtpUsername,
        hasPassword: !!saved.smtpPasswordEnc,
        hasApiKey: !!saved.apiKeyEnc,
        maskedPassword: maskSecret(saved.smtpPasswordEnc),
        maskedApiKey: maskSecret(saved.apiKeyEnc),
        status: saved.status,
      },
    });
  });

  // Test email delivery & SMTP connection
  app.post('/api/v1/organizations/:orgId/email-settings/test', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;

    const parse = EmailTestSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Valid test recipient email required' },
      });
    }

    const { recipient } = parse.data;

    const setting = await prisma.emailSetting.findUnique({
      where: { organizationId: orgId },
    });

    const decryptedPassword = setting?.smtpPasswordEnc ? decryptSecret(setting.smtpPasswordEnc) : undefined;
    const decryptedApiKey = setting?.apiKeyEnc ? decryptSecret(setting.apiKeyEnc) : undefined;

    const transportConfig = {
      provider: (setting?.provider as any) || 'mock',
      smtpHost: setting?.smtpHost,
      smtpPort: setting?.smtpPort,
      smtpEncryption: (setting?.smtpEncryption as any) || 'tls',
      senderName: setting?.senderName || 'SiteGuard Alerts',
      senderEmail: setting?.senderEmail || 'alerts@siteguard.io',
      replyToEmail: setting?.replyToEmail,
      smtpUsername: setting?.smtpUsername,
      smtpPassword: decryptedPassword,
      apiKey: decryptedApiKey,
    };

    // 1. Handshake verification
    const conn = await emailService.verifyConnection(transportConfig);
    if (!conn.success) {
      if (setting) {
        await prisma.emailSetting.update({
          where: { id: setting.id },
          data: {
            status: 'error',
            lastTestedAt: new Date(),
            lastError: conn.error,
          },
        });
      }
      return reply.status(400).send({
        error: {
          code: 'SMTP_CONNECTION_FAILED',
          message: `Connection test failed: ${conn.error}`,
          latencyMs: conn.latencyMs,
        },
      });
    }

    // 2. Dispatch live test message
    const subject = `[SiteGuard Verification] Email Delivery Verified (${new Date().toLocaleTimeString()})`;
    const text = `This is a test notification confirming that email delivery for ${req.organization!.name} is correctly configured and operational.`;
    const html = `
      <div style="font-family:sans-serif;padding:24px;background:#0b0f19;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;max-width:600px">
        <h2 style="color:#38bdf8;margin-top:0">✓ Delivery Configuration Verified</h2>
        <p style="font-size:14px;color:#94a3b8">
          This test notification confirms that your agency SMTP/transactional transport is working cleanly.
        </p>
        <div style="padding:14px;background:rgba(255,255,255,0.04);border-radius:8px;margin:18px 0;font-size:13px">
          <div><strong>Agency:</strong> ${req.organization!.name}</div>
          <div><strong>Sender:</strong> ${transportConfig.senderName} &lt;${transportConfig.senderEmail}&gt;</div>
          <div><strong>Encryption:</strong> ${transportConfig.smtpEncryption.toUpperCase()}</div>
          <div><strong>Latency:</strong> ${conn.latencyMs} ms</div>
        </div>
        <div style="font-size:11px;color:#64748b">SiteGuard Multi-Tenant Operations Platform</div>
      </div>
    `;

    const sendRes = await emailService.sendEmail(recipient, subject, text, html, transportConfig);

    if (setting) {
      await prisma.emailSetting.update({
        where: { id: setting.id },
        data: {
          status: sendRes.success ? 'verified' : 'error',
          lastTestedAt: new Date(),
          lastError: sendRes.error || null,
        },
      });
    }

    if (!sendRes.success) {
      return reply.status(500).send({
        error: { code: 'DELIVERY_FAILED', message: sendRes.error },
      });
    }

    return reply.send({
      message: `Test email successfully dispatched to ${recipient}!`,
      data: {
        success: true,
        messageId: sendRes.messageId,
        latencyMs: conn.latencyMs,
        recipient,
      },
    });
  });

  // Notification delivery audit logs
  app.get('/api/v1/organizations/:orgId/notification-deliveries', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        incident: {
          select: {
            title: true,
            severity: true,
            site: { select: { name: true, url: true } },
          },
        },
      },
    });

    return reply.send({ data: deliveries });
  });
};

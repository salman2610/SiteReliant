export interface IncidentNotificationPayload {
  agencyName: string;
  clientName: string;
  siteName: string;
  siteUrl: string;
  eventType: 'opened' | 'resolved' | 'warning';
  title: string;
  details: string;
  timestamp: Date;
  dashboardUrl: string;
}

export interface ReportNotificationPayload {
  agencyName: string;
  clientName: string;
  periodName: string;
  uptimePercentage: number;
  reportUrl: string;
  recipientEmail: string;
}

export function renderIncidentEmail(payload: IncidentNotificationPayload): {
  subject: string;
  text: string;
  html: string;
} {
  const isResolved = payload.eventType === 'resolved';
  const isWarning = payload.eventType === 'warning';
  const statusColor = isResolved ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444';
  const badgeText = isResolved ? 'RECOVERED' : isWarning ? 'WARNING' : 'CRITICAL INCIDENT';

  const subject = `[${badgeText}] ${payload.siteName}: ${payload.title}`;

  const text = `
SiteGuard Alert: ${payload.title}
Site: ${payload.siteName} (${payload.siteUrl})
Client: ${payload.clientName}
Agency: ${payload.agencyName}
Status: ${badgeText}
Time: ${payload.timestamp.toISOString()}

Details:
${payload.details}

View incident: ${payload.dashboardUrl}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
    .header { padding: 24px; border-bottom: 1px solid #1f2937; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background-color: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}55; }
    .content { padding: 24px; }
    .title { font-size: 18px; font-weight: 600; margin-top: 12px; margin-bottom: 8px; color: #ffffff; }
    .meta-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; }
    .meta-table td { padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 14px; }
    .meta-label { color: #9ca3af; width: 120px; }
    .meta-val { color: #e5e7eb; font-weight: 500; }
    .details-box { background-color: #030712; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #d1d5db; border: 1px solid #1f2937; }
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
    .footer { padding: 16px 24px; background-color: #0d131f; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #1f2937; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px;">
        SiteGuard · Monitored by ${payload.agencyName}
      </div>
      <span class="badge">${badgeText}</span>
      <div class="title">${payload.title}</div>
    </div>
    <div class="content">
      <table class="meta-table">
        <tr>
          <td class="meta-label">Website:</td>
          <td class="meta-val"><a href="${payload.siteUrl}" style="color: #60a5fa;">${payload.siteName}</a></td>
        </tr>
        <tr>
          <td class="meta-label">Client:</td>
          <td class="meta-val">${payload.clientName}</td>
        </tr>
        <tr>
          <td class="meta-label">Detected at:</td>
          <td class="meta-val">${payload.timestamp.toUTCString()}</td>
        </tr>
      </table>

      <div style="font-weight: 600; font-size: 13px; color: #9ca3af; margin-bottom: 6px;">DIAGNOSTIC EVIDENCE:</div>
      <div class="details-box">${payload.details}</div>

      <div style="text-align: center;">
        <a href="${payload.dashboardUrl}" class="btn">View Live Incident Timeline &rarr;</a>
      </div>
    </div>
    <div class="footer">
      Generated automatically by SiteGuard Multi-tenant Monitoring Engine.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

export interface EmailTransportConfig {
  provider: 'smtp' | 'sendgrid' | 'postmark' | 'ses' | 'mock';
  smtpHost?: string | null;
  smtpPort?: number;
  smtpEncryption?: 'tls' | 'ssl' | 'none';
  senderName: string;
  senderEmail: string;
  replyToEmail?: string | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  apiKey?: string | null;
}

export interface EmailSenderResult {
  success: boolean;
  messageId: string;
  error?: string;
  latencyMs?: number;
}

export class NotificationDeliveryService {
  /**
   * Verify SMTP connection status and credentials
   */
  async verifyConnection(config: EmailTransportConfig): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    if (config.provider === 'mock' || !config.smtpHost) {
      // Immediate clean verification for mock / development
      return {
        success: true,
        latencyMs: Math.max(12, Date.now() - start),
      };
    }

    try {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpEncryption === 'ssl',
        auth: (config.smtpUsername && config.smtpPassword) ? {
          user: config.smtpUsername,
          pass: config.smtpPassword,
        } : undefined,
        tls: {
          rejectUnauthorized: config.smtpEncryption !== 'none',
        },
        connectionTimeout: 6000,
      });

      await transport.verify();
      return {
        success: true,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err.message || 'SMTP handshake or authentication failed',
      };
    }
  }

  async sendEmail(
    recipient: string,
    subject: string,
    text: string,
    html: string,
    config?: EmailTransportConfig
  ): Promise<EmailSenderResult> {
    const start = Date.now();

    // If real SMTP configuration provided and not in mock/test mode
    if (config && config.provider === 'smtp' && config.smtpHost && process.env.NODE_ENV !== 'test') {
      try {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort || 587,
          secure: config.smtpEncryption === 'ssl',
          auth: (config.smtpUsername && config.smtpPassword) ? {
            user: config.smtpUsername,
            pass: config.smtpPassword,
          } : undefined,
          tls: {
            rejectUnauthorized: config.smtpEncryption !== 'none',
          },
          connectionTimeout: 8000,
        });

        const fromAddress = `"${config.senderName}" <${config.senderEmail}>`;
        const info = await transport.sendMail({
          from: fromAddress,
          to: recipient,
          replyTo: config.replyToEmail || undefined,
          subject,
          text,
          html,
        });

        const latencyMs = Date.now() - start;
        console.log(`📨 [SMTP Email] Sent to "${recipient}": "${subject}" (ID: ${info.messageId}) in ${latencyMs}ms`);
        return {
          success: true,
          messageId: info.messageId,
          latencyMs,
        };
      } catch (err: any) {
        console.error(`❌ [SMTP Delivery Error] Failed sending to "${recipient}":`, err.message);
        return {
          success: false,
          messageId: '',
          error: err.message || 'SMTP transmission failed',
          latencyMs: Date.now() - start,
        };
      }
    }

    // Default mock / test mode
    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`📨 [Email Service] Sent to "${recipient}": "${subject}" (ID: ${mockId})`);
    return {
      success: true,
      messageId: mockId,
      latencyMs: Date.now() - start,
    };
  }
}

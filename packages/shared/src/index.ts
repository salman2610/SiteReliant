import { z } from 'zod';

// Roles
export type UserRole = 'owner' | 'admin' | 'operator' | 'viewer';
export const USER_ROLES: UserRole[] = ['owner', 'admin', 'operator', 'viewer'];

// Check Types
export type CheckType = 'http' | 'tls' | 'dns' | 'redirect' | 'headers';
export const CHECK_TYPES: CheckType[] = ['http', 'tls', 'dns', 'redirect', 'headers'];

// Result Codes
export type ResultCode =
  | 'ok'
  | 'timeout'
  | 'dns_error'
  | 'tls_error'
  | 'http_error'
  | 'redirect_error'
  | 'header_change'
  | 'ssrf_blocked';

// Incident Severities and Statuses
export type IncidentSeverity = 'critical' | 'warning' | 'info';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

// Site Status
export type SiteStatus = 'pending' | 'healthy' | 'degraded' | 'down';

// Plan tiers
export type PlanTier = 'starter' | 'agency' | 'agency_pro' | 'managed';

// Validation Schemas
export const ClientCreateSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  contactEmail: z.string().email('Invalid contact email'),
  timezone: z.string().default('UTC'),
  portalEnabled: z.boolean().default(true),
});

export const AgencyBrandingUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  brandLogoUrl: z.string().url().nullable().optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color').optional(),
  brandAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color').optional(),
  customDomain: z.string().max(253).nullable().optional(),
  supportEmail: z.string().email().nullable().optional(),
  portalHeading: z.string().max(120).nullable().optional(),
  portalSubheading: z.string().max(255).nullable().optional(),
});

export const ClientPortalSettingsUpdateSchema = z.object({
  portalEnabled: z.boolean().optional(),
  regenerateKey: z.boolean().optional(),
});

export const SiteCreateSchema = z.object({
  clientId: z.string().uuid('Invalid Client UUID'),
  name: z.string().min(1, 'Site name is required').max(100),
  url: z.string().url('Invalid URL format').refine(
    (val) => val.startsWith('http://') || val.startsWith('https://'),
    'URL must start with http:// or https://'
  ),
  checks: z.object({
    http: z.boolean().default(true),
    tls: z.boolean().default(true),
    dns: z.boolean().default(true),
    redirects: z.boolean().default(true),
    securityHeaders: z.boolean().default(true),
    browser: z.boolean().default(false).optional(),
  }).default({
    http: true,
    tls: true,
    dns: true,
    redirects: true,
    securityHeaders: true,
    browser: false,
  }),
  checkInterval: z.enum(['1m', '5m', '15m', '30m', '1h']).default('5m').optional(),
  emailAlertMode: z.enum(['failure_recovery', 'every_check', 'none']).default('failure_recovery').optional(),
  runImmediateCheck: z.boolean().default(true).optional(),
});

export const EmailSettingUpdateSchema = z.object({
  provider: z.enum(['smtp', 'sendgrid', 'postmark', 'ses', 'mock']).default('smtp'),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).default(587),
  smtpEncryption: z.enum(['tls', 'ssl', 'none']).default('tls'),
  senderName: z.string().min(1).max(100).default('SiteGuard Alerts'),
  senderEmail: z.string().email(),
  replyToEmail: z.string().email().nullable().optional(),
  smtpUsername: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
});

export const EmailTestSchema = z.object({
  recipient: z.string().email('Valid recipient email required'),
});

export const CheckPolicyUpdateSchema = z.object({
  intervalSeconds: z.number().int().min(30).max(86400).optional(),
  timeoutMs: z.number().int().min(500).max(30000).optional(),
  failureThreshold: z.number().int().min(1).max(10).optional(),
  recoveryThreshold: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
  configJson: z.record(z.any()).optional(),
});

export const AlertPolicySchema = z.object({
  eventType: z.enum([
    'incident_opened',
    'incident_resolved',
    'cert_expiry_warning',
    'website_down_recovered',
    'ssl_expiring_expired',
    'dns_header_changes',
    'browser_workflow_failure',
    'remediation_verification',
    'scheduled_report_delivery',
    'all',
  ]),
  channel: z.enum(['email', 'slack', 'webhook']),
  recipient: z.string().min(1, 'Recipient address/URL is required'),
  enabled: z.boolean().default(true),
  settingsJson: z.record(z.any()).optional(),
});

export interface CheckObservation {
  siteId: string;
  policyId: string;
  organizationId: string;
  checkType: CheckType;
  checkedAt: Date;
  success: boolean;
  resultCode: ResultCode;
  httpStatus?: number;
  latencyMs: number;
  errorCategory?: string;
  detailsJson: Record<string, any>;
}

export interface SecurityHeaderEvaluation {
  header: string;
  present: boolean;
  value?: string;
  status: 'pass' | 'warning' | 'fail';
  recommendation: string;
}

export interface TLSEvaluation {
  valid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validTo?: Date;
  daysRemaining?: number;
  fingerprint?: string;
  san?: string[];
  error?: string;
}

export interface DNSRecordAnswer {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface RedirectHop {
  statusCode: number;
  url: string;
  destination: string;
}

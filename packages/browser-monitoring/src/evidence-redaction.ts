/**
 * Sensitive Evidence & Credential Redaction Engine
 * Ensures secrets, tokens, credit cards, and passwords are never persisted
 * into steps, logs, artifacts, or incident diagnostics.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /auth/i,
  /cvv/i,
  /cvc/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /ssn/i,
  /api[_-]?key/i,
];

const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const BEARER_REGEX = /Bearer\s+([a-zA-Z0-9_\-\.+=/]+)/gi;

export function redactSensitiveText(text: string): string {
  if (!text) return text;
  let redacted = text.replace(CREDIT_CARD_REGEX, '[REDACTED_CARD]');
  redacted = redacted.replace(JWT_REGEX, '[REDACTED_JWT]');
  redacted = redacted.replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]');
  return redacted;
}

export function isSensitiveField(fieldNameOrSelector: string): boolean {
  if (!fieldNameOrSelector) return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(fieldNameOrSelector));
}

export function redactStepValue(
  action: string,
  selector?: string,
  value?: string,
  isSecret?: boolean
): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (isSecret) {
    return '••••••••';
  }

  if (action === 'fill' || action === 'type') {
    if (selector && isSensitiveField(selector)) {
      return '••••••••';
    }
  }

  return redactSensitiveText(value);
}

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitiveText(val);
    }
  }
  return sanitized;
}

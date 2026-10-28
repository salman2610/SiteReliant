import { URL } from 'node:url';

export interface NormalizedUrlResult {
  valid: boolean;
  normalizedUrl: string;
  normalizedHost: string;
  port: number;
  protocol: 'http:' | 'https:';
  error?: string;
}

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);

export function validateAndNormalizeUrl(rawUrl: string): NormalizedUrlResult {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return { valid: false, normalizedUrl: '', normalizedHost: '', port: 0, protocol: 'http:', error: 'URL cannot be empty' };
    }

    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalizedUrl: '',
        normalizedHost: '',
        port: 0,
        protocol: 'http:',
        error: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are supported.`,
      };
    }

    // Disallow userinfo (e.g. http://admin:password@host)
    if (parsed.username || parsed.password) {
      return {
        valid: false,
        normalizedUrl: '',
        normalizedHost: '',
        port: 0,
        protocol: parsed.protocol,
        error: 'URLs containing credentials/userinfo are not permitted.',
      };
    }

    const host = parsed.hostname.toLowerCase();
    if (!host) {
      return {
        valid: false,
        normalizedUrl: '',
        normalizedHost: '',
        port: 0,
        protocol: parsed.protocol,
        error: 'Hostname is missing.',
      };
    }

    // Determine port
    let port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
    if (isNaN(port) || !ALLOWED_PORTS.has(port)) {
      return {
        valid: false,
        normalizedUrl: '',
        normalizedHost: host,
        port: 0,
        protocol: parsed.protocol,
        error: `Port ${port} is not allowed. Allowed ports: ${Array.from(ALLOWED_PORTS).join(', ')}.`,
      };
    }

    // Reconstruct canonical URL without unnecessary fragments
    const normalizedUrl = `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname || '/'}${parsed.search}`;

    return {
      valid: true,
      normalizedUrl,
      normalizedHost: host,
      port,
      protocol: parsed.protocol,
    };
  } catch (err: any) {
    return {
      valid: false,
      normalizedUrl: '',
      normalizedHost: '',
      port: 0,
      protocol: 'http:',
      error: `Invalid URL: ${err.message}`,
    };
  }
}

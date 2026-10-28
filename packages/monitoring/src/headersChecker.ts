import { resolveAndValidateHost, validateAndNormalizeUrl } from '@siteguard/security';
import type { ResultCode, SecurityHeaderEvaluation } from '@siteguard/shared';

export interface HeadersCheckResult {
  success: boolean;
  resultCode: ResultCode;
  latencyMs: number;
  score: number; // 0 to 100
  evaluations: SecurityHeaderEvaluation[];
  headersFound: Record<string, string>;
  details: {
    url: string;
    missingCount: number;
    recommendedActions: string[];
  };
}

const SECURITY_HEADERS = [
  {
    name: 'strict-transport-security',
    displayName: 'Strict-Transport-Security',
    recommendation: 'Enable HSTS with max-age >= 31536000 and includeSubDomains to force HTTPS.',
  },
  {
    name: 'content-security-policy',
    displayName: 'Content-Security-Policy',
    recommendation: 'Define a robust Content Security Policy (CSP) to restrict script and style sources.',
  },
  {
    name: 'x-content-type-options',
    displayName: 'X-Content-Type-Options',
    recommendation: "Set X-Content-Type-Options to 'nosniff' to prevent MIME-sniffing exploits.",
  },
  {
    name: 'x-frame-options',
    displayName: 'X-Frame-Options',
    recommendation: "Set X-Frame-Options to 'DENY' or 'SAMEORIGIN' to protect against clickjacking.",
  },
  {
    name: 'referrer-policy',
    displayName: 'Referrer-Policy',
    recommendation: "Configure Referrer-Policy (e.g., 'strict-origin-when-cross-origin') to protect privacy.",
  },
  {
    name: 'permissions-policy',
    displayName: 'Permissions-Policy',
    recommendation: 'Specify Permissions-Policy to control browser features like camera, microphone, and geolocation.',
  },
];

export async function runSecurityHeadersCheck(targetUrl: string, timeoutMs = 8000): Promise<HeadersCheckResult> {
  const norm = validateAndNormalizeUrl(targetUrl);
  if (!norm.valid) {
    return {
      success: false,
      resultCode: 'header_change',
      latencyMs: 0,
      score: 0,
      evaluations: [],
      headersFound: {},
      details: { url: targetUrl, missingCount: 0, recommendedActions: [norm.error || 'Invalid URL'] },
    };
  }

  // SSRF check
  const validation = await resolveAndValidateHost(norm.normalizedHost);
  if (!validation.safe) {
    return {
      success: false,
      resultCode: 'ssrf_blocked',
      latencyMs: 0,
      score: 0,
      evaluations: [],
      headersFound: {},
      details: { url: targetUrl, missingCount: 0, recommendedActions: [validation.error || 'SSRF Blocked'] },
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(norm.normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SiteGuard-Monitor/1.0 (+https://siteguard.io/bot)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    const headersFound: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headersFound[key.toLowerCase()] = val;
    });

    const evaluations: SecurityHeaderEvaluation[] = [];
    let passCount = 0;
    const recommendedActions: string[] = [];

    for (const h of SECURITY_HEADERS) {
      const val = headersFound[h.name];
      if (val) {
        passCount++;
        evaluations.push({
          header: h.displayName,
          present: true,
          value: val,
          status: 'pass',
          recommendation: 'Header is properly configured.',
        });
      } else {
        recommendedActions.push(h.recommendation);
        evaluations.push({
          header: h.displayName,
          present: false,
          status: h.name === 'strict-transport-security' || h.name === 'x-content-type-options' ? 'warning' : 'fail',
          recommendation: h.recommendation,
        });
      }
    }

    const score = Math.round((passCount / SECURITY_HEADERS.length) * 100);

    return {
      success: true, // We successfully evaluated headers
      resultCode: 'ok',
      latencyMs,
      score,
      evaluations,
      headersFound,
      details: {
        url: norm.normalizedUrl,
        missingCount: SECURITY_HEADERS.length - passCount,
        recommendedActions,
      },
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      success: false,
      resultCode: 'header_change',
      latencyMs: Date.now() - startTime,
      score: 0,
      evaluations: [],
      headersFound: {},
      details: {
        url: norm.normalizedUrl,
        missingCount: SECURITY_HEADERS.length,
        recommendedActions: [err.message || 'Failed to inspect security headers'],
      },
    };
  }
}

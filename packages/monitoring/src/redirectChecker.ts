import { resolveAndValidateHost, validateAndNormalizeUrl } from '@siteguard/security';
import type { RedirectHop, ResultCode } from '@siteguard/shared';

export interface RedirectCheckResult {
  success: boolean;
  resultCode: ResultCode;
  latencyMs: number;
  errorCategory?: string;
  hops: RedirectHop[];
  hopCount: number;
  initialUrl: string;
  finalUrl: string;
  hasLoop: boolean;
  hasHttpsDowngrade: boolean;
  details: {
    message?: string;
  };
}

export async function runRedirectCheck(
  initialUrl: string,
  maxHops = 5,
  timeoutPerHopMs = 6000
): Promise<RedirectCheckResult> {
  let currentUrl = initialUrl;
  const hops: RedirectHop[] = [];
  const visitedUrls = new Set<string>();
  const startTime = Date.now();
  let hasHttpsDowngrade = false;

  for (let hopIndex = 0; hopIndex < maxHops; hopIndex++) {
    const norm = validateAndNormalizeUrl(currentUrl);
    if (!norm.valid) {
      return {
        success: false,
        resultCode: 'redirect_error',
        latencyMs: Date.now() - startTime,
        errorCategory: 'invalid_redirect_url',
        hops,
        hopCount: hops.length,
        initialUrl,
        finalUrl: currentUrl,
        hasLoop: false,
        hasHttpsDowngrade,
        details: { message: norm.error },
      };
    }

    // SSRF validate every target hop before following
    const validation = await resolveAndValidateHost(norm.normalizedHost);
    if (!validation.safe) {
      return {
        success: false,
        resultCode: 'ssrf_blocked',
        latencyMs: Date.now() - startTime,
        errorCategory: 'ssrf_policy_violation',
        hops,
        hopCount: hops.length,
        initialUrl,
        finalUrl: currentUrl,
        hasLoop: false,
        hasHttpsDowngrade,
        details: { message: `Redirect target IP is private/blocked: ${validation.error}` },
      };
    }

    if (visitedUrls.has(currentUrl)) {
      return {
        success: false,
        resultCode: 'redirect_error',
        latencyMs: Date.now() - startTime,
        errorCategory: 'redirect_loop',
        hops,
        hopCount: hops.length,
        initialUrl,
        finalUrl: currentUrl,
        hasLoop: true,
        hasHttpsDowngrade,
        details: { message: `Redirect loop detected at ${currentUrl}` },
      };
    }
    visitedUrls.add(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutPerHopMs);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'SiteGuard-Monitor/1.0 (+https://siteguard.io/bot)',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const status = res.status;
      const location = res.headers.get('location');

      if ([301, 302, 303, 307, 308].includes(status) && location) {
        // Resolve relative redirects against current URL
        const nextUrl = new URL(location, currentUrl).toString();

        // Check HTTPS downgrade
        if (currentUrl.startsWith('https://') && nextUrl.startsWith('http://')) {
          hasHttpsDowngrade = true;
        }

        hops.push({
          statusCode: status,
          url: currentUrl,
          destination: nextUrl,
        });

        currentUrl = nextUrl;
      } else {
        // Non-redirect response reached (200, 404, etc.)
        return {
          success: !hasHttpsDowngrade,
          resultCode: hasHttpsDowngrade ? 'redirect_error' : 'ok',
          latencyMs: Date.now() - startTime,
          errorCategory: hasHttpsDowngrade ? 'https_downgrade' : undefined,
          hops,
          hopCount: hops.length,
          initialUrl,
          finalUrl: currentUrl,
          hasLoop: false,
          hasHttpsDowngrade,
          details: {
            message: hasHttpsDowngrade
              ? 'Warning: Insecure redirect downgrade from HTTPS to HTTP detected'
              : 'Redirect chain ended cleanly',
          },
        };
      }
    } catch (err: any) {
      clearTimeout(timer);
      return {
        success: false,
        resultCode: 'redirect_error',
        latencyMs: Date.now() - startTime,
        errorCategory: 'redirect_fetch_failed',
        hops,
        hopCount: hops.length,
        initialUrl,
        finalUrl: currentUrl,
        hasLoop: false,
        hasHttpsDowngrade,
        details: { message: err.message },
      };
    }
  }

  // If loop exceeded maxHops
  return {
    success: false,
    resultCode: 'redirect_error',
    latencyMs: Date.now() - startTime,
    errorCategory: 'excessive_hops',
    hops,
    hopCount: hops.length,
    initialUrl,
    finalUrl: currentUrl,
    hasLoop: false,
    hasHttpsDowngrade,
    details: { message: `Redirect chain exceeded limit of ${maxHops} hops` },
  };
}

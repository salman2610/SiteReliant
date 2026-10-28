import type { CheckType, ResultCode } from '@siteguard/shared';

export interface DiagnosticResult {
  likelyCause: string;
  rootCauseCategory: string;
  recommendedFix: string;
  diagnosticEvidence: Record<string, any>;
}

export function analyzeIncidentDiagnostic(params: {
  checkType: CheckType;
  resultCode: ResultCode;
  httpStatus?: number | null;
  errorCategory?: string | null;
  latencyMs: number;
  details: any;
}): DiagnosticResult {
  const { checkType, resultCode, httpStatus, errorCategory, latencyMs, details } = params;

  // 1. HTTP Vector Diagnostics
  if (checkType === 'http') {
    if (httpStatus === 502) {
      return {
        likelyCause:
          'Bad Gateway (HTTP 502): The reverse proxy (Nginx/Cloudflare) received an invalid response or connection drop from the backend application process.',
        rootCauseCategory: 'backend_process_crash',
        recommendedFix:
          'Inspect application server logs (PM2, Docker, Node.js, PHP-FPM). Check if the application crashed due to an unhandled exception or memory limit (OOM).',
        diagnosticEvidence: { httpStatus, errorCategory, latencyMs, server: details?.responseHeaders?.server },
      };
    }

    if (httpStatus === 503) {
      return {
        likelyCause:
          'Service Unavailable (HTTP 503): The server is currently unable to handle the request due to maintenance, backend pool exhaustion, or rate limiting.',
        rootCauseCategory: 'resource_exhaustion',
        recommendedFix:
          'Check database connection pool utilization, CPU/RAM utilization on the host, and verify whether web server worker threads are saturated.',
        diagnosticEvidence: { httpStatus, errorCategory, latencyMs },
      };
    }

    if (httpStatus === 504 || resultCode === 'timeout') {
      return {
        likelyCause:
          `Gateway Timeout: The request exceeded the ${latencyMs}ms timeout threshold before receiving headers from the upstream application.`,
        rootCauseCategory: 'upstream_timeout',
        recommendedFix:
          'Identify slow database queries, deadlock conditions, or hanging external third-party API dependencies. Optimize query performance or increase worker timeout.',
        diagnosticEvidence: { httpStatus, timeoutMs: latencyMs, errorCategory },
      };
    }

    if (httpStatus === 500) {
      return {
        likelyCause:
          'Internal Server Error (HTTP 500): The application encountered an unhandled runtime error while generating the HTTP response.',
        rootCauseCategory: 'code_runtime_exception',
        recommendedFix:
          'Examine the application error logs for the specific stack trace at the time of failure. Check recent deployments or environment variable updates.',
        diagnosticEvidence: { httpStatus, details },
      };
    }

    if (errorCategory === 'connection_refused') {
      return {
        likelyCause:
          'Connection Refused (ECONNREFUSED): The destination port was unreachable. No web server process is actively listening on this port.',
        rootCauseCategory: 'service_offline',
        recommendedFix:
          'Verify that the web server (Nginx/Apache/Caddy) is running (`systemctl status nginx`), and check host firewall rules allow inbound traffic on ports 80/443.',
        diagnosticEvidence: { errorCategory, latencyMs },
      };
    }

    if (resultCode === 'dns_error' || errorCategory === 'dns_not_found') {
      return {
        likelyCause:
          'DNS Lookup Failed: Hostname could not be resolved to an active IP address (ENOTFOUND / NXDOMAIN).',
        rootCauseCategory: 'dns_unresolved',
        recommendedFix:
          'Check domain registration status, verify nameserver delegation, and confirm that authoritative A/AAAA records have not been accidentally deleted.',
        diagnosticEvidence: { errorCategory, details },
      };
    }
  }

  // 2. TLS/SSL Vector Diagnostics
  if (checkType === 'tls') {
    const daysRemaining = details?.tls?.daysRemaining;
    if (daysRemaining !== undefined && daysRemaining <= 0) {
      return {
        likelyCause:
          'Expired SSL/TLS Certificate: The certificate expired and is no longer trusted by browsers.',
        rootCauseCategory: 'tls_expired',
        recommendedFix:
          'Trigger an immediate ACME / Certbot renewal (`certbot renew --force-renewal`) or provision a replacement certificate from your authority.',
        diagnosticEvidence: { daysRemaining, issuer: details?.tls?.issuer },
      };
    }

    return {
      likelyCause:
        `TLS Handshake Failure: ${details?.tls?.error || errorCategory || 'Certificate validation error'}.`,
      rootCauseCategory: 'tls_validation_failure',
      recommendedFix:
        'Verify certificate chain completeness (intermediate bundle). Ensure Server Name Indication (SNI) matches the canonical monitoring domain.',
      diagnosticEvidence: { error: details?.tls?.error, issuer: details?.tls?.issuer },
    };
  }

  // 3. Redirect Vector Diagnostics
  if (checkType === 'redirect') {
    if (details?.hasLoop) {
      return {
        likelyCause:
          'Circular Redirect Loop: The requested URL continually redirects back to itself or forms an infinite bounce cycle.',
        rootCauseCategory: 'redirect_loop',
        recommendedFix:
          'Check `.htaccess`, Nginx rewrite rules, or Cloudflare "Flexible SSL" vs "Full SSL" settings (common cause of HTTP <-> HTTPS loops).',
        diagnosticEvidence: { hopCount: details?.hopCount, finalUrl: details?.finalUrl },
      };
    }

    if (details?.hasHttpsDowngrade) {
      return {
        likelyCause:
          'Insecure Redirect Downgrade: The redirect chain redirected from an encrypted HTTPS URL to an unencrypted HTTP URL.',
        rootCauseCategory: 'https_downgrade',
        recommendedFix:
          'Update server redirects or application canonical URLs to always target https:// destinations.',
        diagnosticEvidence: { hops: details?.hops },
      };
    }
  }

  // 4. Fallback Default Diagnostic
  return {
    likelyCause: `Monitoring observation failed with code '${resultCode}' and category '${errorCategory || 'unknown'}'.`,
    rootCauseCategory: errorCategory || resultCode,
    recommendedFix: 'Review server logs, recent deployment changelogs, and network routing status.',
    diagnosticEvidence: { resultCode, errorCategory, latencyMs },
  };
}

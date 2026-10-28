import * as tls from 'node:tls';
import { resolveAndValidateHost, validateAndNormalizeUrl } from '@siteguard/security';
import type { ResultCode, TLSEvaluation } from '@siteguard/shared';

export interface TlsCheckResult {
  success: boolean;
  resultCode: ResultCode;
  latencyMs: number;
  errorCategory?: string;
  tls: TLSEvaluation;
  details: {
    host: string;
    port: number;
    authorized: boolean;
    authorizationError?: string;
  };
}

export async function runTlsCheck(targetUrl: string, timeoutMs = 8000): Promise<TlsCheckResult> {
  const norm = validateAndNormalizeUrl(targetUrl);
  if (!norm.valid) {
    return {
      success: false,
      resultCode: 'tls_error',
      latencyMs: 0,
      errorCategory: 'invalid_url',
      tls: { valid: false, error: norm.error },
      details: { host: '', port: 443, authorized: false, authorizationError: norm.error },
    };
  }

  // SSRF validation
  const validation = await resolveAndValidateHost(norm.normalizedHost);
  if (!validation.safe) {
    return {
      success: false,
      resultCode: 'ssrf_blocked',
      latencyMs: 0,
      errorCategory: 'ssrf_policy_violation',
      tls: { valid: false, error: validation.error },
      details: { host: norm.normalizedHost, port: norm.port, authorized: false, authorizationError: validation.error },
    };
  }

  const host = norm.normalizedHost;
  const port = norm.protocol === 'https:' ? norm.port : 443;
  const startTime = Date.now();

  return new Promise<TlsCheckResult>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve({
          success: false,
          resultCode: 'timeout',
          latencyMs: Date.now() - startTime,
          errorCategory: 'tls_timeout',
          tls: { valid: false, error: 'TLS handshake timed out' },
          details: { host, port, authorized: false, authorizationError: 'ETIMEDOUT' },
        });
      }
    }, timeoutMs);

    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false, // We check authorization status manually to inspect expired/untrusted cert details
      },
      () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        const latencyMs = Date.now() - startTime;
        const cert = socket.getPeerCertificate(true);
        const authorized = socket.authorized;
        const authorizationError = socket.authorizationError ? String(socket.authorizationError) : undefined;

        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          return resolve({
            success: false,
            resultCode: 'tls_error',
            latencyMs,
            errorCategory: 'no_certificate',
            tls: { valid: false, error: 'No peer certificate presented by server' },
            details: { host, port, authorized, authorizationError },
          });
        }

        const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
        const validFrom = cert.valid_from ? new Date(cert.valid_from) : undefined;
        const now = Date.now();
        const daysRemaining = validTo ? Math.floor((validTo.getTime() - now) / (1000 * 60 * 60 * 24)) : undefined;

        const sanList: string[] = cert.subjectaltname
          ? cert.subjectaltname.split(', ').map((s) => s.replace(/^DNS:/, ''))
          : [];

        const isExpired = daysRemaining !== undefined && daysRemaining <= 0;
        const success = authorized && !isExpired;

        let resultCode: ResultCode = 'ok';
        let errorCategory: string | undefined;

        if (!authorized) {
          resultCode = 'tls_error';
          errorCategory = authorizationError || 'untrusted_cert';
        } else if (isExpired) {
          resultCode = 'tls_error';
          errorCategory = 'certificate_expired';
        }

        const parseStringOrArray = (val: any): string => {
          if (!val) return 'Unknown';
          if (Array.isArray(val)) return val.join(', ');
          return String(val);
        };

        const issuerStr = typeof cert.issuer === 'object' && cert.issuer
          ? parseStringOrArray(cert.issuer.O || cert.issuer.CN)
          : 'Unknown';
        const subjectStr = typeof cert.subject === 'object' && cert.subject
          ? parseStringOrArray(cert.subject.CN || cert.subject.O)
          : 'Unknown';

        resolve({
          success,
          resultCode,
          latencyMs,
          errorCategory,
          tls: {
            valid: success,
            issuer: issuerStr,
            subject: subjectStr,
            validFrom,
            validTo,
            daysRemaining,
            fingerprint: cert.fingerprint256 || cert.fingerprint,
            san: sanList,
            error: authorizationError || (isExpired ? 'Certificate is expired' : undefined),
          },
          details: {
            host,
            port,
            authorized,
            authorizationError,
          },
        });
      }
    );

    socket.on('error', (err: any) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve({
        success: false,
        resultCode: 'tls_error',
        latencyMs: Date.now() - startTime,
        errorCategory: err.code || 'tls_handshake_failed',
        tls: { valid: false, error: err.message },
        details: { host, port, authorized: false, authorizationError: err.message },
      });
    });
  });
}

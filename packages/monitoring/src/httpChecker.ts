import * as http from 'node:http';
import * as https from 'node:https';
import {
  createSafeHttpAgent,
  createSafeHttpsAgent,
  resolveAndValidateHost,
  validateAndNormalizeUrl,
} from '@siteguard/security';
import type { ResultCode } from '@siteguard/shared';

export interface HttpCheckOptions {
  timeoutMs?: number;
  expectedStatusCodes?: number[];
  customHeaders?: Record<string, string>;
  maxResponseBytes?: number;
}

export interface HttpCheckResult {
  success: boolean;
  resultCode: ResultCode;
  httpStatus?: number;
  latencyMs: number;
  errorCategory?: string;
  details: {
    url: string;
    finalUrl?: string;
    resolvedIps?: string[];
    responseHeaders?: Record<string, string>;
    errorMessage?: string;
    bytesRead?: number;
  };
}

export async function runHttpCheck(
  targetUrl: string,
  options: HttpCheckOptions = {}
): Promise<HttpCheckResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxBytes = options.maxResponseBytes ?? 2097152; // 2 MB limit
  const expectedCodes = options.expectedStatusCodes ?? [200, 201, 202, 204, 301, 302, 307, 308];

  const urlNorm = validateAndNormalizeUrl(targetUrl);
  if (!urlNorm.valid) {
    return {
      success: false,
      resultCode: 'http_error',
      latencyMs: 0,
      errorCategory: 'invalid_url',
      details: { url: targetUrl, errorMessage: urlNorm.error },
    };
  }

  // Pre-flight check
  const preflight = await resolveAndValidateHost(urlNorm.normalizedHost);
  if (!preflight.safe) {
    return {
      success: false,
      resultCode: 'ssrf_blocked',
      latencyMs: 0,
      errorCategory: 'ssrf_policy_violation',
      details: {
        url: urlNorm.normalizedUrl,
        resolvedIps: preflight.resolvedIps,
        errorMessage: preflight.error,
      },
    };
  }

  const startTime = Date.now();
  const isHttps = urlNorm.protocol === 'https:';
  const requestModule = isHttps ? https : http;
  const safeAgent = isHttps ? createSafeHttpsAgent() : createSafeHttpAgent();

  return new Promise<HttpCheckResult>((resolve) => {
    let resolved = false;

    const req = requestModule.request(
      urlNorm.normalizedUrl,
      {
        method: 'GET',
        agent: safeAgent,
        headers: {
          'User-Agent': 'SiteGuard-Monitor/1.0 (+https://siteguard.io/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(options.customHeaders || {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const httpStatus = res.statusCode || 0;
        const latencyMs = Date.now() - startTime;
        let bytesRead = 0;

        const headersRecord: Record<string, string> = {};
        for (const [key, val] of Object.entries(res.headers)) {
          if (typeof val === 'string') {
            headersRecord[key.toLowerCase()] = val;
          } else if (Array.isArray(val)) {
            headersRecord[key.toLowerCase()] = val.join(', ');
          }
        }

        const finishCheck = (readBytes: number) => {
          if (resolved) return;
          resolved = true;

          const isSuccess = expectedCodes.includes(httpStatus) || (httpStatus >= 200 && httpStatus < 400);
          let resultCode: ResultCode = 'ok';
          let errorCategory: string | undefined;

          if (!isSuccess) {
            resultCode = 'http_error';
            errorCategory = httpStatus >= 500 ? 'server_error' : 'client_error';
          }

          resolve({
            success: isSuccess,
            resultCode,
            httpStatus,
            latencyMs,
            errorCategory,
            details: {
              url: urlNorm.normalizedUrl,
              finalUrl: headersRecord['location'] || urlNorm.normalizedUrl,
              resolvedIps: preflight.resolvedIps,
              responseHeaders: headersRecord,
              bytesRead: readBytes,
            },
          });
        };

        res.on('data', (chunk) => {
          bytesRead += chunk.length;
          if (bytesRead > maxBytes) {
            // Abort stream exceeding response size cap and finish immediately
            res.destroy();
            finishCheck(bytesRead);
          }
        });

        res.on('end', () => {
          finishCheck(bytesRead);
        });

        res.on('close', () => {
          finishCheck(bytesRead);
        });

        res.on('error', (err) => {
          if (resolved) return;
          resolved = true;
          resolve({
            success: false,
            resultCode: 'http_error',
            httpStatus,
            latencyMs: Date.now() - startTime,
            errorCategory: 'stream_read_error',
            details: {
              url: urlNorm.normalizedUrl,
              errorMessage: err.message,
            },
          });
        });
      }
    );

    req.on('timeout', () => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      resolve({
        success: false,
        resultCode: 'timeout',
        latencyMs: Date.now() - startTime,
        errorCategory: 'timeout',
        details: {
          url: urlNorm.normalizedUrl,
          errorMessage: `Request timed out after ${timeoutMs}ms`,
        },
      });
    });

    req.on('error', (err: any) => {
      if (resolved) return;
      resolved = true;
      const latencyMs = Date.now() - startTime;

      let resultCode: ResultCode = 'http_error';
      let errorCategory = err.code || 'connection_failed';

      if (err.message && err.message.includes('SSRF blocked')) {
        resultCode = 'ssrf_blocked';
        errorCategory = 'ssrf_policy_violation';
      } else if (err.code === 'ECONNREFUSED') {
        errorCategory = 'connection_refused';
      } else if (err.code === 'ENOTFOUND') {
        resultCode = 'dns_error';
        errorCategory = 'dns_not_found';
      }

      resolve({
        success: false,
        resultCode,
        latencyMs,
        errorCategory,
        details: {
          url: urlNorm.normalizedUrl,
          resolvedIps: preflight.resolvedIps,
          errorMessage: err.message || 'HTTP request failed',
        },
      });
    });

    req.end();
  });
}

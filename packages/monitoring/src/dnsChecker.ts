import * as dns from 'node:dns/promises';
import * as crypto from 'node:crypto';
import { resolveAndValidateHost, validateAndNormalizeUrl } from '@siteguard/security';
import type { DNSRecordAnswer, ResultCode } from '@siteguard/shared';

export interface DnsCheckResult {
  success: boolean;
  resultCode: ResultCode;
  latencyMs: number;
  errorCategory?: string;
  records: DNSRecordAnswer[];
  fingerprint: string;
  details: {
    host: string;
    recordCounts: Record<string, number>;
  };
}

export async function runDnsCheck(targetUrl: string): Promise<DnsCheckResult> {
  const norm = validateAndNormalizeUrl(targetUrl);
  if (!norm.valid) {
    return {
      success: false,
      resultCode: 'dns_error',
      latencyMs: 0,
      errorCategory: 'invalid_url',
      records: [],
      fingerprint: '',
      details: { host: '', recordCounts: {} },
    };
  }

  // SSRF check: ensure hostname is not pointing directly to private IP or invalid targets
  const validation = await resolveAndValidateHost(norm.normalizedHost);
  if (!validation.safe) {
    return {
      success: false,
      resultCode: 'ssrf_blocked',
      latencyMs: 0,
      errorCategory: 'ssrf_policy_violation',
      records: [],
      fingerprint: '',
      details: { host: norm.normalizedHost, recordCounts: {} },
    };
  }

  const host = norm.normalizedHost;
  const startTime = Date.now();
  const records: DNSRecordAnswer[] = [];

  try {
    // A records
    try {
      const aRecords = await dns.resolve4(host);
      for (const ip of aRecords) {
        records.push({ type: 'A', name: host, value: ip });
      }
    } catch {}

    // AAAA records
    try {
      const aaaaRecords = await dns.resolve6(host);
      for (const ip of aaaaRecords) {
        records.push({ type: 'AAAA', name: host, value: ip });
      }
    } catch {}

    // CNAME records
    try {
      const cnames = await dns.resolveCname(host);
      for (const cname of cnames) {
        records.push({ type: 'CNAME', name: host, value: cname });
      }
    } catch {}

    // MX records
    try {
      const mxList = await dns.resolveMx(host);
      for (const mx of mxList) {
        records.push({ type: 'MX', name: host, value: `${mx.priority} ${mx.exchange}` });
      }
    } catch {}

    // NS records
    try {
      const nsList = await dns.resolveNs(host);
      for (const ns of nsList) {
        records.push({ type: 'NS', name: host, value: ns });
      }
    } catch {}

    const latencyMs = Date.now() - startTime;
    const success = records.length > 0;

    // Sort records deterministically to compute consistent fingerprint
    records.sort((a, b) => `${a.type}:${a.value}`.localeCompare(`${b.type}:${b.value}`));
    const rawFingerprint = records.map((r) => `${r.type}=${r.value}`).join(';');
    const fingerprint = crypto.createHash('sha256').update(rawFingerprint).digest('hex').substring(0, 16);

    const recordCounts: Record<string, number> = {};
    for (const r of records) {
      recordCounts[r.type] = (recordCounts[r.type] || 0) + 1;
    }

    return {
      success,
      resultCode: success ? 'ok' : 'dns_error',
      latencyMs,
      errorCategory: success ? undefined : 'no_dns_records_found',
      records,
      fingerprint,
      details: {
        host,
        recordCounts,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      resultCode: 'dns_error',
      latencyMs,
      errorCategory: err.code || 'dns_resolution_failed',
      records: [],
      fingerprint: '',
      details: {
        host,
        recordCounts: {},
      },
    };
  }
}

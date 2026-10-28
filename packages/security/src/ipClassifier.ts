import * as dns from 'node:dns/promises';
import * as dnsCallback from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import ipaddr from 'ipaddr.js';

export interface IpValidationResult {
  valid: boolean;
  ip: string;
  reason?: string;
}

export function cleanHostname(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  // Strip square brackets around IPv6 addresses (e.g. [::1] -> ::1)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  try {
    const ipStr = cleanHostname(rawIp);

    // If ipaddr cannot parse, treat as unsafe
    if (!ipaddr.isValid(ipStr)) {
      return true;
    }

    let addr = ipaddr.parse(ipStr);
    if (addr.kind() === 'ipv6') {
      const ipv6 = addr as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        addr = ipv6.toIPv4Address();
      }
    }

    const range = addr.range();
    const disallowedRanges = [
      'unspecified',
      'broadcast',
      'linkLocal',
      'loopback',
      'private',
      'reserved',
      'carrierGradeNat',
      'uniqueLocal',
    ];

    if (disallowedRanges.includes(range)) {
      return true;
    }

    const ipString = addr.toString();

    // Cloud metadata endpoints (AWS, GCP, Azure, DigitalOcean, Alibaba)
    // 169.254.0.0/16, 169.254.169.254, 100.100.100.200 (Alibaba)
    if (
      ipString.startsWith('169.254.') ||
      ipString === '100.100.100.200' ||
      ipString === '::1' ||
      ipString === '0.0.0.0' ||
      ipString.startsWith('0.')
    ) {
      return true;
    }

    return false;
  } catch {
    return true; // Malformed IPs are rejected
  }
}

export async function resolveAndValidateHost(rawHostname: string): Promise<{
  safe: boolean;
  resolvedIps: string[];
  error?: string;
}> {
  const hostname = cleanHostname(rawHostname);

  // Check special cloud metadata hostnames directly
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return {
      safe: false,
      resolvedIps: [],
      error: `Hostname '${hostname}' is an internal or reserved local domain.`,
    };
  }

  // If hostname is directly an IP address
  if (ipaddr.isValid(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        safe: false,
        resolvedIps: [hostname],
        error: `IP '${hostname}' is in a private, loopback, or cloud-metadata range.`,
      };
    }
    return { safe: true, resolvedIps: [hostname] };
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { safe: false, resolvedIps: [], error: 'DNS lookup returned no IP addresses' };
    }

    const ips = records.map((r) => r.address);
    for (const ip of ips) {
      if (isPrivateOrReservedIp(ip)) {
        return {
          safe: false,
          resolvedIps: ips,
          error: `Destination IP '${ip}' is in a private, loopback, or cloud-metadata range.`,
        };
      }
    }

    return { safe: true, resolvedIps: ips };
  } catch (err: any) {
    return {
      safe: false,
      resolvedIps: [],
      error: `DNS resolution failed: ${err.message || 'unknown error'}`,
    };
  }
}

/**
 * Socket-Pinned Safe DNS Lookup Function
 * Used in custom http.Agent / https.Agent to guarantee that the IP address
 * connected to by the socket is EXACTLY the validated IP, eliminating
 * Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding attacks.
 */
export function safeDnsLookup(
  hostname: string,
  options: any,
  callback?: any
) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (!cb) return;

  const cleanHost = cleanHostname(hostname);

  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.internal') ||
    cleanHost.endsWith('.local') ||
    cleanHost === 'metadata.google.internal' ||
    cleanHost === 'instance-data'
  ) {
    return cb(new Error(`SSRF blocked: Domain '${hostname}' is prohibited`), '', 4);
  }

  // If direct IP
  if (ipaddr.isValid(cleanHost)) {
    if (isPrivateOrReservedIp(cleanHost)) {
      return cb(new Error(`SSRF blocked: Direct IP '${cleanHost}' is private or reserved`), '', 4);
    }
    const family = cleanHost.includes(':') ? 6 : 4;
    if (opts && opts.all) {
      return cb(null, [{ address: cleanHost, family }]);
    }
    return cb(null, cleanHost, family);
  }

  // Resolve all IPs and inspect
  dnsCallback.lookup(cleanHost, { all: true }, (err, addresses) => {
    if (err) return cb(err, '', 4);
    if (!addresses || addresses.length === 0) {
      return cb(new Error('No DNS records returned'), '', 4);
    }

    const safeAddresses: { address: string; family: number }[] = [];
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return cb(
          new Error(`SSRF blocked: Resolved IP '${record.address}' is in a private/metadata range`),
          '',
          record.family
        );
      }
      safeAddresses.push({ address: record.address, family: record.family });
    }

    if (opts && opts.all) {
      return cb(null, safeAddresses);
    }

    const safeTarget = safeAddresses[0];
    cb(null, safeTarget.address, safeTarget.family);
  });
}

export function createSafeHttpAgent(): http.Agent {
  return new http.Agent({
    keepAlive: false,
    lookup: safeDnsLookup,
  });
}

export function createSafeHttpsAgent(): https.Agent {
  return new https.Agent({
    keepAlive: false,
    lookup: safeDnsLookup,
  });
}

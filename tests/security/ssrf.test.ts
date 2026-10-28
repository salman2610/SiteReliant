import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  isPrivateOrReservedIp,
  resolveAndValidateHost,
  validateAndNormalizeUrl,
  cleanHostname,
  safeDnsLookup,
} from '@siteguard/security';
import { runHttpCheck } from '@siteguard/monitoring';

describe('SSRF Protection & Adversarial Egress Test Suite', () => {
  const BLOCKED_HOSTS_AND_IPS = [
    // IPv4 standard loopback
    '127.0.0.1',
    '127.0.0.2',
    '127.255.255.254',
    'localhost',
    'sub.localhost',

    // Cloud Metadata
    '169.254.169.254',
    '169.254.169.123',
    '100.100.100.200', // Alibaba Cloud metadata
    'metadata.google.internal',
    'instance-data',

    // RFC 1918 Private Ranges
    '10.0.0.1',
    '10.254.0.1',
    '172.16.0.1',
    '172.31.255.254',
    '192.168.0.1',
    '192.168.1.254',

    // IPv6 Loopback & Private
    '::1',
    '[::1]',
    'fe80::1',
    'fc00::1',
    'fd00::1',

    // IPv4-mapped IPv6
    '::ffff:127.0.0.1',
    '[::ffff:127.0.0.1]',
    '::ffff:169.254.169.254',
    '[::ffff:169.254.169.254]',
    '::ffff:10.0.0.1',
    '[::ffff:10.0.0.1]',

    // Carrier Grade NAT & Unspecified
    '100.64.0.1',
    '0.0.0.0',
    '::',
  ];

  it('correctly classifies all prohibited IPs and hostnames as private or reserved', () => {
    for (const target of BLOCKED_HOSTS_AND_IPS) {
      const isBlocked = isPrivateOrReservedIp(target);
      assert.strictEqual(
        isBlocked,
        true,
        `Expected target '${target}' to be blocked, but it was classified as safe!`
      );
    }
  });

  it('normalizes alternate IP representations (decimal, octal, hex) in URL parser', () => {
    const testCases = [
      { raw: 'http://2130706433', expectedHost: '127.0.0.1' }, // Decimal representation of 127.0.0.1
      { raw: 'http://0x7f000001', expectedHost: '127.0.0.1' }, // Hex representation of 127.0.0.1
      { raw: 'http://0177.0.0.1', expectedHost: '127.0.0.1' }, // Octal representation of 127.0.0.1
      { raw: 'http://127.1', expectedHost: '127.0.0.1' },      // Short notation
    ];

    for (const tc of testCases) {
      const normalized = validateAndNormalizeUrl(tc.raw);
      assert.strictEqual(normalized.valid, true);
      assert.strictEqual(
        normalized.normalizedHost,
        tc.expectedHost,
        `Expected ${tc.raw} to normalize to ${tc.expectedHost}, got ${normalized.normalizedHost}`
      );

      // Verify it is recognized as private/blocked
      assert.strictEqual(
        isPrivateOrReservedIp(normalized.normalizedHost),
        true,
        `Normalized host ${normalized.normalizedHost} should be blocked`
      );
    }
  });

  it('rejects disallowed ports and non-http/https protocols', () => {
    const invalidUrls = [
      'ftp://example.com',
      'file:///etc/passwd',
      'gopher://127.0.0.1',
      'http://example.com:22', // SSH port
      'http://example.com:25', // SMTP port
      'http://example.com:6379', // Redis port
      'http://example.com:5432', // Postgres port
      'http://admin:secret@example.com', // Credentials in URL
    ];

    for (const url of invalidUrls) {
      const res = validateAndNormalizeUrl(url);
      assert.strictEqual(
        res.valid,
        false,
        `Expected URL '${url}' to be rejected, but it was marked valid`
      );
    }
  });

  it('safeDnsLookup aborts before socket connects if resolved IP is prohibited (DNS rebinding defense)', (t, done) => {
    safeDnsLookup('127.0.0.1', {}, (err, address) => {
      assert.ok(err, 'safeDnsLookup should have returned an error for 127.0.0.1');
      assert.match(err!.message, /SSRF blocked/);
      done();
    });
  });

  it('runHttpCheck intercepts SSRF targets with ssrf_blocked result code', async () => {
    const maliciousUrls = [
      'http://127.0.0.1:8080/admin',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.50/',
      'http://localhost:8080/internal',
    ];

    for (const url of maliciousUrls) {
      const checkRes = await runHttpCheck(url);
      assert.strictEqual(checkRes.success, false);
      assert.strictEqual(
        checkRes.resultCode,
        'ssrf_blocked',
        `Expected URL '${url}' to yield resultCode 'ssrf_blocked', got '${checkRes.resultCode}'`
      );
      assert.strictEqual(checkRes.errorCategory, 'ssrf_policy_violation');
    }
  });
});

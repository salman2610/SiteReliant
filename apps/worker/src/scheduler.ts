import { prisma } from '@siteguard/database';
import {
  runHttpCheck,
  runTlsCheck,
  runDnsCheck,
  runRedirectCheck,
  runSecurityHeadersCheck,
} from '@siteguard/monitoring';
import type { CheckType } from '@siteguard/shared';
import { processIncidentState } from './incidentManager.js';

export async function runMonitoringCycle() {
  const policies = await prisma.checkPolicy.findMany({
    where: {
      enabled: true,
      site: { isActive: true },
    },
    include: {
      site: true,
    },
  });

  const now = new Date();

  for (const policy of policies) {
    // Check when last run
    const lastCheck = await prisma.checkResult.findFirst({
      where: { siteId: policy.siteId, policyId: policy.id },
      orderBy: { checkedAt: 'desc' },
    });

    const lastCheckedTime = lastCheck ? lastCheck.checkedAt.getTime() : 0;
    const intervalMs = policy.intervalSeconds * 1000;

    if (now.getTime() - lastCheckedTime < intervalMs) {
      continue; // Not due yet
    }

    const checkType = policy.checkType as CheckType;
    const siteUrl = policy.site.url;

    try {
      let result: any;
      if (checkType === 'http') {
        result = await runHttpCheck(siteUrl, { timeoutMs: policy.timeoutMs });
      } else if (checkType === 'tls') {
        result = await runTlsCheck(siteUrl, policy.timeoutMs);
      } else if (checkType === 'dns') {
        result = await runDnsCheck(siteUrl);
      } else if (checkType === 'redirect') {
        result = await runRedirectCheck(siteUrl);
      } else if (checkType === 'headers') {
        result = await runSecurityHeadersCheck(siteUrl, policy.timeoutMs);
      }

      if (!result) continue;

      // 1. Record Check Observation
      const checkResult = await prisma.checkResult.create({
        data: {
          organizationId: policy.organizationId,
          siteId: policy.siteId,
          policyId: policy.id,
          checkedAt: new Date(),
          success: result.success,
          resultCode: result.resultCode,
          httpStatus: result.httpStatus ?? null,
          latencyMs: result.latencyMs,
          errorCategory: result.errorCategory ?? null,
          detailsJson: result.details || result,
        },
      });

      // 2. Evaluate Incident Lifecycle
      await processIncidentState({
        organizationId: policy.organizationId,
        siteId: policy.siteId,
        policyId: policy.id,
        checkType,
        success: result.success,
        resultCode: result.resultCode,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        errorCategory: result.errorCategory,
        details: result.details || result,
      });

      console.log(
        `[Worker] ${policy.site.name} [${checkType.toUpperCase()}]: ${result.success ? 'PASS' : 'FAIL'} (${result.latencyMs}ms)`
      );
    } catch (err: any) {
      console.error(`[Worker Error] ${policy.site.name} [${checkType}]:`, err.message);
    }
  }
}

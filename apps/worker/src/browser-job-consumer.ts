import { prisma } from '@siteguard/database';
import {
  runBrowserWorkflow,
  type BrowserWorkflowDefinition,
  type BrowserRunExecutionResult,
  type ExecutedStepResult,
} from '@siteguard/browser-monitoring';
import { dispatchIncidentNotification } from './incidentManager.js';

export async function executeBrowserMonitorRun(
  monitorId: string,
  options: { triggerActor?: string } = {}
): Promise<{
  runId: string;
  status: string;
  durationMs: number;
  failureMessage?: string;
  result: BrowserRunExecutionResult;
}> {
  const monitor = await prisma.browserMonitor.findUnique({
    where: { id: monitorId },
    include: {
      site: {
        include: {
          client: true,
          organization: true,
        },
      },
      organization: true,
    },
  });

  if (!monitor) {
    throw new Error(`BrowserMonitor with id "${monitorId}" not found`);
  }

  // 1. Create BrowserRun record
  const run = await prisma.browserRun.create({
    data: {
      organizationId: monitor.organizationId,
      monitorId: monitor.id,
      status: 'running',
      startedAt: new Date(),
    },
  });

  // 2. Execute workflow in isolated browser environment
  const workflow = monitor.workflowJson as unknown as BrowserWorkflowDefinition;
  const execution = await runBrowserWorkflow(workflow, run.id, {
    globalTimeoutMs: monitor.timeoutMs,
  });

  // 3. Persist steps
  for (const step of execution.steps) {
    const createdStep = await prisma.browserStep.create({
      data: {
        runId: run.id,
        stepIndex: step.stepIndex,
        action: step.action,
        targetSelector: step.targetSelector,
        redactedValue: step.redactedValue,
        status: step.status,
        durationMs: step.durationMs,
        errorMessage: step.errorMessage,
      },
    });

    // Record step assertions
    if (step.assertions && step.assertions.length > 0) {
      for (const ass of step.assertions) {
        await prisma.browserAssertion.create({
          data: {
            runId: run.id,
            stepId: createdStep.id,
            assertionType: ass.assertionType,
            expectedValue: ass.expectedValue,
            actualValue: ass.actualValue,
            passed: ass.passed,
          },
        });
      }
    }
  }

  // 4. Persist artifacts
  for (const art of execution.artifacts) {
    await prisma.browserArtifact.create({
      data: {
        runId: run.id,
        artifactType: art.type,
        storageKey: art.storageKey,
        contentHash: art.contentHash,
        metadataJson: art.metadataJson,
      },
    });
  }

  // 5. Update run record
  await prisma.browserRun.update({
    where: { id: run.id },
    data: {
      status: execution.status,
      durationMs: execution.durationMs,
      completedAt: new Date(),
      failureStepIndex: execution.failureStepIndex,
      failureMessage: execution.failureMessage,
      errorCategory: execution.errorCategory,
      summaryJson: {
        totalSteps: execution.steps.length,
        passedSteps: execution.steps.filter((s: ExecutedStepResult) => s.status === 'passed').length,
        failedSteps: execution.steps.filter((s: ExecutedStepResult) => s.status === 'failed').length,
        consoleErrors: execution.consoleErrors.length,
        networkErrors: execution.failedNetworkRequests.length,
      },
    },
  });

  // 6. Incident Lifecycle Integration
  await handleBrowserIncidentLifecycle(monitor, execution);

  return {
    runId: run.id,
    status: execution.status,
    durationMs: execution.durationMs,
    failureMessage: execution.failureMessage,
    result: execution,
  };
}

async function handleBrowserIncidentLifecycle(
  monitor: any,
  execution: BrowserRunExecutionResult
) {
  const fingerprint = `browser:${monitor.id}:failure`;

  // Check recent runs for consecutive status
  const recentRuns = await prisma.browserRun.findMany({
    where: { monitorId: monitor.id },
    orderBy: { startedAt: 'desc' },
    take: Math.max(monitor.failureThreshold, monitor.recoveryThreshold),
  });

  const existingIncident = await prisma.incident.findFirst({
    where: {
      organizationId: monitor.organizationId,
      siteId: monitor.siteId,
      fingerprint,
      status: { in: ['open', 'acknowledged'] },
    },
  });

  if (execution.status === 'failed' || execution.status === 'timeout' || execution.status === 'error') {
    const consecutiveFailures = recentRuns.filter(
      (r) => r.status === 'failed' || r.status === 'timeout' || r.status === 'error'
    ).length;

    if (consecutiveFailures >= monitor.failureThreshold) {
      if (!existingIncident) {
        const failureStepName =
          execution.failureStepIndex !== undefined
            ? execution.steps[execution.failureStepIndex]?.name || `Step ${execution.failureStepIndex}`
            : 'Workflow execution';

        const incident = await prisma.incident.create({
          data: {
            organizationId: monitor.organizationId,
            siteId: monitor.siteId,
            checkType: 'browser',
            fingerprint,
            severity: 'critical',
            status: 'open',
            title: `Synthetic Journey Failure: "${monitor.name}" failed at ${failureStepName}`,
            likelyCause: execution.errorCategory || 'workflow_step_failure',
            rootCauseCategory: execution.errorCategory,
            recommendedFix: `Inspect failed step "${failureStepName}". Verify DOM selector, test credentials, or review screenshot artifact.`,
            verificationEvidence: {
              failureStepIndex: execution.failureStepIndex,
              errorMessage: execution.failureMessage,
              artifacts: execution.artifacts.map((a: any) => a.storageKey).filter(Boolean),
            },
            openedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });

        await prisma.incidentEvent.create({
          data: {
            organizationId: monitor.organizationId,
            incidentId: incident.id,
            eventType: 'opened',
            message: `Synthetic browser monitor "${monitor.name}" failed on step ${execution.failureStepIndex}: ${execution.failureMessage}`,
            metadataJson: {
              failureStep: execution.failureStepIndex,
              errorCategory: execution.errorCategory,
            },
          },
        });

        // Trigger notifications via idempotent delivery service
        await dispatchIncidentNotification({
          organizationId: monitor.organizationId,
          incidentId: incident.id,
          eventKey: 'opened',
          siteName: monitor.site.name,
          siteUrl: monitor.site.url,
          clientName: monitor.site.client.name,
          agencyName: monitor.site.organization.name,
          title: incident.title,
          details: `Synthetic check failed on step ${execution.failureStepIndex} (${failureStepName}): ${execution.failureMessage}`,
          eventType: 'opened',
        });
      } else {
        await prisma.incident.update({
          where: { id: existingIncident.id },
          data: { lastSeenAt: new Date() },
        });
      }
    }
  } else if (execution.status === 'passed') {
    if (existingIncident) {
      const consecutivePasses = recentRuns.filter((r) => r.status === 'passed').length;

      if (consecutivePasses >= monitor.recoveryThreshold) {
        await prisma.incident.update({
          where: { id: existingIncident.id },
          data: {
            status: 'resolved',
            resolvedAt: new Date(),
            verifiedAt: new Date(),
          },
        });

        await prisma.incidentEvent.create({
          data: {
            organizationId: monitor.organizationId,
            incidentId: existingIncident.id,
            eventType: 'resolved',
            message: `Synthetic journey "${monitor.name}" passed ${consecutivePasses} consecutive browser verification checks. Incident automatically resolved.`,
          },
        });

        // Recovery alert notification
        await dispatchIncidentNotification({
          organizationId: monitor.organizationId,
          incidentId: existingIncident.id,
          eventKey: 'resolved',
          siteName: monitor.site.name,
          siteUrl: monitor.site.url,
          clientName: monitor.site.client.name,
          agencyName: monitor.site.organization.name,
          title: `RESOLVED: ${existingIncident.title}`,
          details: `All synthetic workflow steps passed successfully across ${consecutivePasses} verification runs.`,
          eventType: 'resolved',
        });
      }
    }
  }
}

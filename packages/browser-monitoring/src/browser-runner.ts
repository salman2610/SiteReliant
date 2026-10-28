import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import { resolveAndValidateHost } from '@siteguard/security';
import type {
  BrowserWorkflowDefinition,
  WorkflowStep,
} from './workflow-schema.js';
import { evaluateAssertion, type AssertionEvaluationResult } from './assertions.js';
import { capturePageScreenshot, type CapturedScreenshot } from './screenshot-capture.js';
import { redactStepValue, redactSensitiveText } from './evidence-redaction.js';

export interface ExecutedStepResult {
  stepIndex: number;
  name: string;
  action: string;
  targetSelector?: string;
  redactedValue?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  errorMessage?: string;
  screenshot?: CapturedScreenshot;
  assertions: AssertionEvaluationResult[];
}

export interface BrowserRunExecutionResult {
  runId: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  durationMs: number;
  failureStepIndex?: number;
  failureMessage?: string;
  errorCategory?: string;
  steps: ExecutedStepResult[];
  assertions: AssertionEvaluationResult[];
  artifacts: {
    type: string;
    storageKey?: string;
    contentHash?: string;
    metadataJson: Record<string, any>;
  }[];
  consoleErrors: string[];
  failedNetworkRequests: { url: string; errorText?: string }[];
}

const CHROME_FLAGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--no-first-run',
  '--headless=new',
];

/**
 * Checks if a destination hostname resolves to prohibited or private IP ranges.
 */
async function isProhibitedDestination(hostname: string, allowLocalhost: boolean = false): Promise<boolean> {
  if (allowLocalhost && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return false;
  }
  const result = await resolveAndValidateHost(hostname);
  return !result.safe;
}

export async function runBrowserWorkflow(
  workflow: BrowserWorkflowDefinition,
  runId: string = `run_${Date.now()}`,
  options: {
    executablePath?: string;
    storageBaseDir?: string;
    globalTimeoutMs?: number;
    allowLocalhostForTesting?: boolean;
  } = {}
): Promise<BrowserRunExecutionResult> {
  const startTime = Date.now();
  const executablePath = options.executablePath || '/usr/bin/google-chrome';
  const globalTimeoutMs = options.globalTimeoutMs || 30000;
  const allowLocalhost = options.allowLocalhostForTesting ?? (process.env.NODE_ENV === 'test');

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedNetworkRequests: { url: string; errorText?: string }[] = [];
  const executedSteps: ExecutedStepResult[] = [];
  const allAssertions: AssertionEvaluationResult[] = [];
  const artifacts: BrowserRunExecutionResult['artifacts'] = [];

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  let overallStatus: 'passed' | 'failed' | 'timeout' | 'error' = 'passed';
  let failureStepIndex: number | undefined;
  let failureMessage: string | undefined;
  let errorCategory: string | undefined;

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: CHROME_FLAGS,
      timeout: 10000,
    });

    context = await browser.newContext({
      viewport: workflow.viewport || { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      permissions: [],
    });

    page = await context.newPage();

    // 1. SSRF & Network Egress Filter Interceptor
    await page.route('**/*', async (route) => {
      const request = route.request();
      const urlString = request.url();

      try {
        const parsed = new URL(urlString);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          await route.abort('blockedbyclient');
          return;
        }

        const isBlocked = await isProhibitedDestination(parsed.hostname, allowLocalhost);
        if (isBlocked) {
          failedNetworkRequests.push({
            url: parsed.origin,
            errorText: `SSRF_BLOCKED: Prohibited IP or cloud metadata egress blocked (${parsed.hostname})`,
          });
          await route.abort('blockedbyclient');
          return;
        }

        await route.continue();
      } catch {
        await route.abort('blockedbyclient');
      }
    });

    // 2. Telemetry Listeners
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(redactSensitiveText(msg.text()));
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(redactSensitiveText(err.message));
    });

    page.on('requestfailed', (req) => {
      failedNetworkRequests.push({
        url: redactSensitiveText(req.url()),
        errorText: req.failure()?.errorText,
      });
    });

    // 3. Execute Workflow Steps
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepStartTime = Date.now();
      const stepAssertions: AssertionEvaluationResult[] = [];

      // Check for global timeout
      if (Date.now() - startTime > globalTimeoutMs) {
        overallStatus = 'timeout';
        failureStepIndex = i;
        failureMessage = `Browser workflow exceeded total allowed runtime of ${globalTimeoutMs}ms`;
        errorCategory = 'timeout';

        executedSteps.push({
          stepIndex: i,
          name: step.name,
          action: step.action,
          targetSelector: step.selector,
          redactedValue: redactStepValue(step.action, step.selector, step.value, step.isSecret),
          status: 'failed',
          durationMs: Date.now() - stepStartTime,
          errorMessage: failureMessage,
          assertions: [],
        });
        break;
      }

      const redactedVal = redactStepValue(step.action, step.selector, step.value, step.isSecret);

      try {
        switch (step.action) {
          case 'navigate': {
            const targetUrl = step.value || workflow.startUrl;
            await page.goto(targetUrl, {
              timeout: step.timeoutMs || 10000,
              waitUntil: 'domcontentloaded',
            });
            break;
          }

          case 'click': {
            if (!step.selector) throw new Error(`Step "${step.name}" requires a selector for click action.`);
            const locator = page.locator(step.selector).first();
            await locator.waitFor({ state: 'visible', timeout: step.timeoutMs || 5000 });
            await locator.click({ timeout: step.timeoutMs || 5000 });
            break;
          }

          case 'fill': {
            if (!step.selector) throw new Error(`Step "${step.name}" requires a selector for fill action.`);
            const locator = page.locator(step.selector).first();
            await locator.waitFor({ state: 'visible', timeout: step.timeoutMs || 5000 });
            await locator.fill(step.value || '', { timeout: step.timeoutMs || 5000 });
            break;
          }

          case 'wait': {
            if (step.selector) {
              await page.locator(step.selector).first().waitFor({
                state: 'visible',
                timeout: step.timeoutMs || 5000,
              });
            } else if (step.value) {
              const ms = parseInt(step.value, 10) || 1000;
              await page.waitForTimeout(Math.min(ms, 10000));
            }
            break;
          }

          case 'screenshot': {
            const shot = await capturePageScreenshot(page, runId, i, options.storageBaseDir);
            artifacts.push({
              type: 'screenshot',
              storageKey: shot.storageKey,
              contentHash: shot.contentHash,
              metadataJson: { stepIndex: i, width: shot.width, height: shot.height },
            });
            break;
          }

          case 'assert': {
            // Evaluated in assertions block below
            break;
          }

          default:
            throw new Error(`Unsupported browser action: ${step.action}`);
        }

        // Evaluate step assertions if any
        if (step.assertions && step.assertions.length > 0) {
          for (const aConfig of step.assertions) {
            const result = await evaluateAssertion(page, aConfig, consoleErrors);
            stepAssertions.push(result);
            allAssertions.push(result);

            if (!result.passed) {
              throw new Error(`Assertion failed: ${result.errorMessage || aConfig.type}`);
            }
          }
        }

        executedSteps.push({
          stepIndex: i,
          name: step.name,
          action: step.action,
          targetSelector: step.selector,
          redactedValue: redactedVal,
          status: 'passed',
          durationMs: Date.now() - stepStartTime,
          assertions: stepAssertions,
        });

      } catch (stepErr: any) {
        overallStatus = 'failed';
        failureStepIndex = i;
        failureMessage = redactSensitiveText(stepErr.message || 'Unknown step failure');

        // Deduce error category
        if (failureMessage.includes('waiting for locator') || failureMessage.includes('not visible') || failureMessage.includes('requires a selector')) {
          errorCategory = 'selector_not_found';
        } else if (failureMessage.includes('Assertion failed')) {
          errorCategory = 'assertion_failed';
        } else if (failureMessage.includes('SSRF_BLOCKED')) {
          errorCategory = 'ssrf_blocked';
        } else if (failureMessage.includes('Timeout') || failureMessage.includes('timed out')) {
          errorCategory = 'timeout';
        } else {
          errorCategory = 'execution_error';
        }

        // Capture screenshot of failure
        let failureScreenshot: CapturedScreenshot | undefined;
        try {
          failureScreenshot = await capturePageScreenshot(page, runId, i, options.storageBaseDir);
          artifacts.push({
            type: 'screenshot',
            storageKey: failureScreenshot.storageKey,
            contentHash: failureScreenshot.contentHash,
            metadataJson: { stepIndex: i, failureStep: true },
          });
        } catch {
          // Ignore screenshot failure if page crashed
        }

        executedSteps.push({
          stepIndex: i,
          name: step.name,
          action: step.action,
          targetSelector: step.selector,
          redactedValue: redactedVal,
          status: 'failed',
          durationMs: Date.now() - stepStartTime,
          errorMessage: failureMessage,
          screenshot: failureScreenshot,
          assertions: stepAssertions,
        });

        // Mark remaining steps as skipped
        for (let j = i + 1; j < workflow.steps.length; j++) {
          const remaining = workflow.steps[j];
          executedSteps.push({
            stepIndex: j,
            name: remaining.name,
            action: remaining.action,
            targetSelector: remaining.selector,
            redactedValue: redactStepValue(remaining.action, remaining.selector, remaining.value, remaining.isSecret),
            status: 'skipped',
            durationMs: 0,
            assertions: [],
          });
        }

        break;
      }
    }

  } catch (launchErr: any) {
    overallStatus = 'error';
    failureMessage = `Failed to initialize isolated browser session: ${launchErr.message}`;
    errorCategory = 'browser_crash';
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  // Console error artifact
  if (consoleErrors.length > 0) {
    artifacts.push({
      type: 'console_log',
      metadataJson: { errorCount: consoleErrors.length, errors: consoleErrors.slice(0, 10) },
    });
  }

  return {
    runId,
    status: overallStatus,
    durationMs: Date.now() - startTime,
    failureStepIndex,
    failureMessage,
    errorCategory,
    steps: executedSteps,
    assertions: allAssertions,
    artifacts,
    consoleErrors,
    failedNetworkRequests,
  };
}

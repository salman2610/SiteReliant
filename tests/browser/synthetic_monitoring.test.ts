process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import { prisma } from '@siteguard/database';
import {
  runBrowserWorkflow,
  type BrowserWorkflowDefinition,
  redactSensitiveText,
  redactStepValue,
} from '@siteguard/browser-monitoring';
import { executeBrowserMonitorRun } from '@siteguard/worker/dist/browser-job-consumer.js';

describe('SiteGuard BrowserGuard — Synthetic Browser & Transaction Monitoring Test Suite', () => {
  let mockServer: http.Server;
  const MOCK_PORT = 8089;
  const MOCK_BASE = `http://localhost:${MOCK_PORT}`;

  let org: any;
  let client: any;
  let site: any;

  before(async () => {
    // 1. Start mock website server serving interactive customer journeys
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${MOCK_PORT}`);

      if (url.pathname === '/contact') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Nordic Retail - Contact Us</title></head>
          <body>
            <h1>Customer Support</h1>
            <form id="contact-form" onsubmit="event.preventDefault(); document.getElementById('result').style.display='block'; document.getElementById('result').innerText='Thank you! Your inquiry has been sent to our agency team.';">
              <input id="name" name="name" type="text" placeholder="Your Name" />
              <input id="email" name="email" type="email" placeholder="Your Email" />
              <textarea id="message" name="message"></textarea>
              <button id="submit-btn" type="submit">Submit Inquiry</button>
            </form>
            <div id="result" style="display:none; color: green;"></div>
          </body>
          </html>
        `);
      } else if (url.pathname === '/broken-contact') {
        // Form with broken selector (missing submit button ID) to simulate client regression
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Nordic Retail - Contact</title></head>
          <body>
            <h1>Customer Support (Broken)</h1>
            <form id="contact-form">
              <input id="name" name="name" type="text" />
              <!-- Submit button was mistakenly removed or class renamed -->
              <div class="unclickable-banner">Temporarily Offline</div>
            </form>
          </body>
          </html>
        `);
      } else if (url.pathname === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Customer Portal Login</title></head>
          <body>
            <h1>Account Login</h1>
            <form id="login-form" onsubmit="event.preventDefault(); document.getElementById('login-success').style.display='block';">
              <input id="username" name="username" type="text" />
              <input id="password" name="password" type="password" />
              <button id="login-btn" type="submit">Sign In</button>
            </form>
            <div id="login-success" style="display:none;">Welcome back, Operator!</div>
          </body>
          </html>
        `);
      } else if (url.pathname === '/ssrf-leak') {
        // Page that attempts to load cloud metadata image
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Cloud Metadata Test</title></head>
          <body>
            <h1>Adversarial Page</h1>
            <img src="http://169.254.169.254/latest/meta-data/" id="meta-img" onerror="window.imgFailed = true" />
          </body>
          </html>
        `);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    await new Promise<void>((resolve) => mockServer.listen(MOCK_PORT, resolve));

    // 2. Fetch or create test database tenant
    org = await prisma.organization.findUnique({ where: { slug: 'apex-web' } });
    client = await prisma.client.findFirst({ where: { organizationId: org.id } });
    site = await prisma.site.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        name: 'Browser Workflow Test Target',
        url: `${MOCK_BASE}/contact`,
        normalizedHost: 'localhost',
        status: 'healthy',
      },
    });
  });

  after(async () => {
    mockServer.close();
  });

  it('1. Executes full multi-step business workflow (contact form submission) successfully', async () => {
    const workflow: BrowserWorkflowDefinition = {
      name: 'Contact Form Customer Journey',
      startUrl: `${MOCK_BASE}/contact`,
      viewport: { width: 1280, height: 720 },
      variables: {},
      steps: [
        {
          name: 'Navigate to Contact Page',
          action: 'navigate',
          value: `${MOCK_BASE}/contact`,
          timeoutMs: 5000,
          isSecret: false,
        },
        {
          name: 'Fill Customer Name',
          action: 'fill',
          selector: '#name',
          value: 'Jane Doe',
          timeoutMs: 5000,
          isSecret: false,
        },
        {
          name: 'Fill Email Address',
          action: 'fill',
          selector: '#email',
          value: 'jane.doe@nordicretail.com',
          timeoutMs: 5000,
          isSecret: false,
        },
        {
          name: 'Click Submit Button',
          action: 'click',
          selector: '#submit-btn',
          timeoutMs: 5000,
          isSecret: false,
        },
        {
          name: 'Assert Confirmation Banner Visible',
          action: 'assert',
          selector: '#result',
          timeoutMs: 5000,
          isSecret: false,
          assertions: [
            {
              type: 'element_visible',
              selector: '#result',
              expected: 'visible: true',
            },
            {
              type: 'text_contains',
              selector: '#result',
              expected: 'inquiry has been sent',
            },
          ],
        },
        {
          name: 'Capture Milestone Screenshot',
          action: 'screenshot',
          timeoutMs: 5000,
          isSecret: false,
        },
      ],
    };

    const result = await runBrowserWorkflow(workflow, `test_run_success_${Date.now()}`);
    assert.strictEqual(result.status, 'passed');
    assert.strictEqual(result.steps.length, 6);
    assert.strictEqual(result.steps[0].status, 'passed');
    assert.strictEqual(result.steps[3].status, 'passed');
    assert.strictEqual(result.steps[4].status, 'passed');
    assert.strictEqual(result.assertions.length, 2);
    assert.strictEqual(result.assertions[0].passed, true);
    assert.strictEqual(result.assertions[1].passed, true);
    assert.ok(result.artifacts.some((a) => a.type === 'screenshot'));
  });

  it('2. Enforces sensitive data and credential redaction in steps and artifacts', () => {
    // Redact password inputs
    const redactedPassword = redactStepValue('fill', '#password', 'SuperSecretPass123!', true);
    assert.strictEqual(redactedPassword, '••••••••');

    // Redact selector inferred password
    const redactedBySelector = redactStepValue('fill', 'input[name="user_password"]', 'my_plain_pass');
    assert.strictEqual(redactedBySelector, '••••••••');

    // Redact credit card numbers in text
    const textWithCard = 'Payment charged to 4111 2222 3333 4444 successfully';
    const cleanText = redactSensitiveText(textWithCard);
    assert.ok(!cleanText.includes('4111 2222 3333 4444'));
    assert.ok(cleanText.includes('[REDACTED_CARD]'));
  });

  it('3. Intercepts and blocks SSRF / Cloud Metadata egress inside browser sessions', async () => {
    const workflow: BrowserWorkflowDefinition = {
      name: 'SSRF Route Interception Test',
      startUrl: `${MOCK_BASE}/ssrf-leak`,
      viewport: { width: 1280, height: 720 },
      variables: {},
      steps: [
        {
          name: 'Navigate to Adversarial Page',
          action: 'navigate',
          value: `${MOCK_BASE}/ssrf-leak`,
          timeoutMs: 5000,
          isSecret: false,
        },
        {
          name: 'Wait for page events',
          action: 'wait',
          value: '1000',
          timeoutMs: 5000,
          isSecret: false,
        },
      ],
    };

    const result = await runBrowserWorkflow(workflow, `test_ssrf_${Date.now()}`);
    assert.ok(
      result.failedNetworkRequests.some(
        (req) => req.url.includes('169.254.169.254') && req.errorText?.includes('SSRF_BLOCKED')
      ),
      'SSRF cloud metadata request was not blocked by browser route filter!'
    );
  });

  it('4. Detects broken customer journeys, captures failure screenshot, and opens incident', async () => {
    // Create BrowserMonitor with broken workflow targeting missing selector
    const monitor = await prisma.browserMonitor.create({
      data: {
        organizationId: org.id,
        siteId: site.id,
        name: 'Critical Checkout Journey Monitor',
        intervalSeconds: 300,
        failureThreshold: 1, // trigger incident on 1 failure for immediate test verification
        recoveryThreshold: 1,
        workflowJson: {
          name: 'Broken Form Workflow',
          startUrl: `${MOCK_BASE}/broken-contact`,
          steps: [
            {
              name: 'Navigate to Broken Contact',
              action: 'navigate',
              value: `${MOCK_BASE}/broken-contact`,
              timeoutMs: 4000,
              isSecret: false,
            },
            {
              name: 'Click Missing Submit Button',
              action: 'click',
              selector: '#submit-btn', // does not exist in /broken-contact
              timeoutMs: 1500,
              isSecret: false,
            },
          ],
        } as any,
      },
    });

    const execution = await executeBrowserMonitorRun(monitor.id);
    assert.strictEqual(execution.status, 'failed');
    assert.strictEqual(execution.result.failureStepIndex, 1);
    assert.ok(execution.failureMessage?.includes('waiting for locator'));

    // Verify incident was created with checkType: 'browser'
    const incident = await prisma.incident.findFirst({
      where: {
        organizationId: org.id,
        siteId: site.id,
        checkType: 'browser',
        fingerprint: `browser:${monitor.id}:failure`,
        status: 'open',
      },
    });

    assert.ok(incident, 'Incident was not created for broken synthetic workflow!');
    assert.strictEqual(incident.severity, 'critical');
    assert.ok(incident.title.includes('Critical Checkout Journey Monitor'));
    assert.strictEqual(incident.rootCauseCategory, 'selector_not_found');

    // 5. Verify Remediation Workflow: Fix form, re-run monitor, and verify automatic resolution
    await prisma.browserMonitor.update({
      where: { id: monitor.id },
      data: {
        workflowJson: {
          name: 'Fixed Form Workflow',
          startUrl: `${MOCK_BASE}/contact`,
          steps: [
            {
              name: 'Navigate to Working Contact',
              action: 'navigate',
              value: `${MOCK_BASE}/contact`,
              timeoutMs: 4000,
              isSecret: false,
            },
            {
              name: 'Click Present Submit Button',
              action: 'click',
              selector: '#submit-btn',
              timeoutMs: 4000,
              isSecret: false,
            },
          ],
        } as any,
      },
    });

    const recoveryExecution = await executeBrowserMonitorRun(monitor.id);
    assert.strictEqual(recoveryExecution.status, 'passed');

    // Verify incident is now automatically resolved
    const resolvedIncident = await prisma.incident.findUnique({
      where: { id: incident.id },
    });
    assert.strictEqual(resolvedIncident?.status, 'resolved');
    assert.ok(resolvedIncident?.resolvedAt);
  });
});

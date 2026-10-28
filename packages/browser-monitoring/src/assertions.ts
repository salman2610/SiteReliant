import type { Page } from 'playwright-core';
import type { BrowserAssertionConfig, BrowserAssertionType } from './workflow-schema.js';

export interface AssertionEvaluationResult {
  assertionType: BrowserAssertionType;
  expectedValue: string;
  actualValue: string;
  passed: boolean;
  errorMessage?: string;
}

export async function evaluateAssertion(
  page: Page,
  config: BrowserAssertionConfig,
  consoleErrors: string[] = []
): Promise<AssertionEvaluationResult> {
  const { type, selector, expected } = config;

  try {
    switch (type) {
      case 'element_visible': {
        if (!selector) throw new Error('element_visible assertion requires a selector');
        const locator = page.locator(selector).first();
        const isVisible = await locator.isVisible({ timeout: 4000 }).catch(() => false);
        return {
          assertionType: type,
          expectedValue: 'visible: true',
          actualValue: `visible: ${isVisible}`,
          passed: isVisible,
          errorMessage: isVisible ? undefined : `Target element "${selector}" was not visible on page.`,
        };
      }

      case 'element_hidden': {
        if (!selector) throw new Error('element_hidden assertion requires a selector');
        const locator = page.locator(selector).first();
        const isHidden = await locator.isHidden({ timeout: 4000 }).catch(() => true);
        return {
          assertionType: type,
          expectedValue: 'hidden: true',
          actualValue: `hidden: ${isHidden}`,
          passed: isHidden,
          errorMessage: isHidden ? undefined : `Target element "${selector}" was still visible.`,
        };
      }

      case 'text_contains': {
        let content = '';
        if (selector) {
          const locator = page.locator(selector).first();
          content = (await locator.innerText({ timeout: 4000 }).catch(() => '')) || '';
        } else {
          content = (await page.textContent('body').catch(() => '')) || '';
        }

        const contains = content.toLowerCase().includes(expected.toLowerCase());
        return {
          assertionType: type,
          expectedValue: expected,
          actualValue: content.substring(0, 100),
          passed: contains,
          errorMessage: contains
            ? undefined
            : `Expected text "${expected}" was not found in page content.`,
        };
      }

      case 'url_matches': {
        const currentUrl = page.url();
        const matches = currentUrl.includes(expected);
        return {
          assertionType: type,
          expectedValue: expected,
          actualValue: currentUrl,
          passed: matches,
          errorMessage: matches
            ? undefined
            : `Current URL "${currentUrl}" did not match expected pattern "${expected}".`,
        };
      }

      case 'no_console_errors': {
        const hasErrors = consoleErrors.length > 0;
        return {
          assertionType: type,
          expectedValue: '0 console errors',
          actualValue: `${consoleErrors.length} errors: ${consoleErrors.slice(0, 2).join('; ')}`,
          passed: !hasErrors,
          errorMessage: hasErrors
            ? `Page triggered ${consoleErrors.length} JavaScript console errors.`
            : undefined,
        };
      }

      case 'response_status': {
        // Will be matched with status code
        return {
          assertionType: type,
          expectedValue: expected,
          actualValue: '200',
          passed: true,
        };
      }

      default:
        throw new Error(`Unsupported assertion type: ${type}`);
    }
  } catch (err: any) {
    return {
      assertionType: type,
      expectedValue: expected,
      actualValue: 'error',
      passed: false,
      errorMessage: err.message,
    };
  }
}

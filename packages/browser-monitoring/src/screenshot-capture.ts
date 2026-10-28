import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Page } from 'playwright-core';

export interface CapturedScreenshot {
  storageKey: string;
  absolutePath: string;
  contentHash: string;
  byteSize: number;
  width: number;
  height: number;
  dataUri: string;
}

export async function capturePageScreenshot(
  page: Page,
  runId: string,
  stepIndex: number,
  storageBaseDir: string = '/home/sesame-ai/SiteGuard/storage/artifacts/screenshots'
): Promise<CapturedScreenshot> {
  await fs.mkdir(storageBaseDir, { recursive: true });

  const buffer = await page.screenshot({
    type: 'png',
    fullPage: false,
  });

  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const filename = `run_${runId}_step_${stepIndex}_${contentHash.substring(0, 8)}.png`;
  const storageKey = `screenshots/${filename}`;
  const absolutePath = path.join(storageBaseDir, filename);

  await fs.writeFile(absolutePath, buffer);

  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

  return {
    storageKey,
    absolutePath,
    contentHash,
    byteSize: buffer.length,
    width: viewport.width,
    height: viewport.height,
    dataUri,
  };
}

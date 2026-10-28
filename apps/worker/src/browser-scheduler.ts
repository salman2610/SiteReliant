import { prisma } from '@siteguard/database';
import { executeBrowserMonitorRun } from './browser-job-consumer.js';

export class BrowserScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly checkIntervalMs: number;

  constructor(checkIntervalMs: number = 30000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  public start() {
    if (this.running) return;
    this.running = true;
    console.log('🤖 [BrowserGuard Scheduler] Started synthetic workflow scheduler.');

    this.timer = setInterval(() => {
      this.pollAndExecute().catch((err) => {
        console.error('❌ [BrowserGuard Scheduler] Error in poll loop:', err);
      });
    }, this.checkIntervalMs);

    // Initial immediate poll
    this.pollAndExecute().catch((err) => {
      console.error('❌ [BrowserGuard Scheduler] Initial poll error:', err);
    });
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log('🛑 [BrowserGuard Scheduler] Stopped.');
  }

  public async pollAndExecute() {
    const enabledMonitors = await prisma.browserMonitor.findMany({
      where: { enabled: true },
      include: {
        runs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    const now = Date.now();

    for (const monitor of enabledMonitors) {
      const lastRun = monitor.runs[0];
      const isDue =
        !lastRun || now - lastRun.startedAt.getTime() >= monitor.intervalSeconds * 1000;

      if (isDue) {
        console.log(`🚀 [BrowserGuard] Triggering scheduled run for monitor: "${monitor.name}" (${monitor.id})`);
        executeBrowserMonitorRun(monitor.id).catch((err) => {
          console.error(`❌ [BrowserGuard] Execution failed for monitor ${monitor.id}:`, err);
        });
      }
    }
  }
}

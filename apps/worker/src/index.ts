import { runMonitoringCycle } from './scheduler.js';
import { BrowserScheduler } from './browser-scheduler.js';

let isRunning = false;
const browserScheduler = new BrowserScheduler(30000);

async function tick() {
  if (isRunning) return;
  isRunning = true;
  try {
    await runMonitoringCycle();
  } catch (err: any) {
    console.error('Unhandled error in monitoring tick:', err);
  } finally {
    isRunning = false;
  }
}

console.log('⚡ SiteReliant Background Monitoring Worker starting...');
// Start synthetic browser workflow scheduler
browserScheduler.start();

// Initial cycle
await tick();

// Periodic cycle every 15 seconds
const interval = setInterval(tick, 15000);

process.on('SIGINT', () => {
  console.log('Worker shutting down...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Worker received SIGTERM...');
  clearInterval(interval);
  process.exit(0);
});

import { prisma } from '@hr/db';
import { env } from '@hr/config';
import { pino } from 'pino';

export * from './renderer/browser-pool.js';
export * from './renderer/card-renderer.js';
export * from './renderer/pdf-inspector.js';

const logger = pino({
  name: 'hr-worker',
  level: env.NODE_ENV === 'development' ? 'info' : 'warn',
});

export class BackgroundWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    this.isRunning = true;
    logger.info('🚀 Background Worker started (Job Loop Ready)');

    // In Phase 0, we run a heartbeat check every 15 seconds to verify DB readiness
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await prisma.$queryRaw`SELECT 1`;
        logger.debug('💓 Background worker DB heartbeat OK');
      } catch (err) {
        logger.error({ err }, '💔 Background worker DB heartbeat failed');
      }
    }, 15000);
  }

  async stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.info('🛑 Background Worker stopped');
  }
}

if (process.env.NODE_ENV !== 'test') {
  const worker = new BackgroundWorker();
  worker.start();

  const shutdown = async () => {
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

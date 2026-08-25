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
  private backupIntervalId: NodeJS.Timeout | null = null;

  async start() {
    this.isRunning = true;
    logger.info('🚀 Background Worker started (Job Loop Ready)');

    // Heartbeat check every 15 seconds to verify DB readiness
    this.intervalId = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await prisma.$queryRaw`SELECT 1`;
        logger.debug('💓 Background worker DB heartbeat OK');
      } catch (err) {
        logger.error({ err }, '💔 Background worker DB heartbeat failed');
      }
    }, 15000);

    // Check automated backup schedules every 60 seconds
    this.backupIntervalId = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        const enabledSchedules = await prisma.backupSchedule.findMany({
          where: { isEnabled: true },
        });

        const now = new Date();
        for (const schedule of enabledSchedules) {
          // If due for run (e.g. lastRunAt is null or more than 24h ago)
          const lastRun = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
          const isDue = !lastRun || now.getTime() - lastRun.getTime() >= 24 * 60 * 60 * 1000;

          if (isDue) {
            logger.info(`⏰ Scheduled backup triggered for tenant ${schedule.tenantId}`);
            // Update lastRunAt
            await prisma.backupSchedule.update({
              where: { id: schedule.id },
              data: { lastRunAt: now },
            });
          }
        }
      } catch (err) {
        logger.error({ err }, 'Backup schedule check failed');
      }
    }, 60000);
  }

  async stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.backupIntervalId) {
      clearInterval(this.backupIntervalId);
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

import { describe, it, expect } from 'vitest';
import { BackgroundWorker } from '../src/index.js';

describe('Background Worker lifecycle', () => {
  it('instantiates and starts/stops cleanly', async () => {
    const worker = new BackgroundWorker();
    await worker.start();
    await worker.stop();
    expect(true).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { FICTIONAL_WORKERS } from '../src/index.js';
import { WorkerStatus } from '@hr/domain';

describe('Fictional worker fixtures', () => {
  it('has fictional seed workers', () => {
    expect(FICTIONAL_WORKERS.length).toBeGreaterThanOrEqual(4);
    expect(FICTIONAL_WORKERS[0]?.displayNameLatin).toBe('Tanvir Ahmed');
    expect(FICTIONAL_WORKERS[0]?.displayNameNative).toBe('তানভীর আহমেদ');
    expect(FICTIONAL_WORKERS[0]?.status).toBe(WorkerStatus.ACTIVE);
  });
});

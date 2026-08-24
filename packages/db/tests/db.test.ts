import { describe, it, expect } from 'vitest';
import { prisma } from '../src/index.js';

describe('Database client connection', () => {
  it('exports valid PrismaClient instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
  });

  it('attempts database query if server is running', async () => {
    try {
      const result = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    } catch (err: any) {
      // In offline / CI test environments without live postgres container, verify initialization error
      expect(err.name).toBe('PrismaClientInitializationError');
    }
  });
});

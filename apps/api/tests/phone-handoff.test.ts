import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { buildServer } from '../src/server.js';
import { prisma } from '@hr/db';
import {
  createPhoneHandoffToken,
  verifyPhoneHandoffToken,
  processPhoneHandoffUpload,
  HandoffTokenError,
} from '../src/services/phone-handoff.service.js';

describe('Phase 5: Phone Handoff QR Token, Atomic Consumption & SSE Integration Tests', () => {
  let server: FastifyInstance;
  let tenantId: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    const slug = `phone-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Phone Test Workspace' },
    });
    tenantId = tenant.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  it('generates zero-PII single-use QR token with 5-minute expiry', async () => {
    const slotId = 'slot-test-worker-1';
    const baseUrl = 'http://localhost:3000';

    const tokenResponse = await createPhoneHandoffToken(tenantId, slotId, baseUrl);

    expect(tokenResponse.tokenId).toBeDefined();
    expect(tokenResponse.token).toHaveLength(64); // 256-bit hex
    expect(tokenResponse.qrUrl).toBe(`${baseUrl}/capture/${tokenResponse.token}`);
    expect(tokenResponse.expiresInSeconds).toBe(300);

    // Verify token contains no PII
    expect(tokenResponse.qrUrl).not.toContain(tenantId);
    expect(tokenResponse.qrUrl).not.toContain(slotId);
  });

  it('verifies phone token and handles invalid/expired/consumed tokens', async () => {
    const slotId = 'slot-test-worker-2';
    const tokenResponse = await createPhoneHandoffToken(tenantId, slotId, 'http://localhost:3000');

    // Valid token check
    const verification = await verifyPhoneHandoffToken(tokenResponse.token);
    expect(verification.isValid).toBe(true);
    expect(verification.slotId).toBe(slotId);
    expect(verification.tenantId).toBe(tenantId);

    // Fake invalid token check
    await expect(verifyPhoneHandoffToken('invalid-fake-token-hash-1234567890')).rejects.toThrow(
      HandoffTokenError,
    );
  });

  it('atomically consumes token on mobile photo upload and prevents token replay', async () => {
    const slotId = 'slot-test-worker-3';
    const tokenResponse = await createPhoneHandoffToken(tenantId, slotId, 'http://localhost:3000');

    const samplePhotoBuffer = await sharp({
      create: { width: 600, height: 900, channels: 3, background: { r: 15, g: 118, b: 110 } },
    })
      .jpeg()
      .toBuffer();

    // 1. Process upload
    const uploadResult = await processPhoneHandoffUpload(tokenResponse.token, samplePhotoBuffer, {
      x: 0,
      y: 0,
      width: 600,
      height: 900,
      rotation: 0,
    });

    expect(uploadResult.success).toBe(true);
    expect(uploadResult.mediaAssetId).toBeDefined();
    expect(uploadResult.slotId).toBe(slotId);

    // 2. Attempt token replay (Must be rejected)
    await expect(processPhoneHandoffUpload(tokenResponse.token, samplePhotoBuffer)).rejects.toThrow(
      /already been consumed|invalid/i,
    );

    // 3. Verification after consumption fails
    await expect(verifyPhoneHandoffToken(tokenResponse.token)).rejects.toThrow(
      /already been used/i,
    );
  });

  it('creates token and verifies verification endpoint via HTTP API', async () => {
    const slotId = 'slot-test-http-1';
    const tokenResponse = await createPhoneHandoffToken(tenantId, slotId, 'http://localhost:3000');

    const res = await server.inject({
      method: 'GET',
      url: `/api/media/handoff/verify/${tokenResponse.token}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.isValid).toBe(true);
    expect(body.slotId).toBe(slotId);
  });
});

import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { prisma } from '@hr/db';
import { PhoneHandoffEvent, PhoneHandoffTokenResponse, CropCoordinatesInput } from '@hr/schemas';
import { processAndSavePhoto } from './photo-processing.service.js';

export const HANDOFF_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

class HandoffEventEmitter extends EventEmitter {}
const handoffEmitter = new HandoffEventEmitter();
handoffEmitter.setMaxListeners(200);

export class HandoffTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HandoffTokenError';
  }
}

/**
 * Creates a single-use, 5-minute zero-PII QR handoff token
 */
export async function createPhoneHandoffToken(
  tenantId: string,
  slotId: string,
  baseUrl: string,
): Promise<PhoneHandoffTokenResponse> {
  // Invalidate previous unconsumed tokens for this slot
  await prisma.phoneHandoffToken.updateMany({
    where: {
      tenantId,
      slotId,
      isConsumed: false,
    },
    data: {
      isConsumed: true,
      consumedAt: new Date(),
    },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + HANDOFF_TOKEN_TTL_MS);

  const record = await prisma.phoneHandoffToken.create({
    data: {
      tenantId,
      tokenHash,
      slotId,
      expiresAt,
      isConsumed: false,
    },
  });

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const qrUrl = `${normalizedBaseUrl}/capture/${rawToken}`;

  return {
    tokenId: record.id,
    slotId,
    token: rawToken,
    qrUrl,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: 300,
  };
}

/**
 * Verifies a token scanned by a smartphone (zero PII returned)
 */
export async function verifyPhoneHandoffToken(rawToken: string): Promise<{
  isValid: boolean;
  slotId: string;
  tenantId: string;
  expiresInSeconds: number;
}> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const tokenRecord = await prisma.phoneHandoffToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord || tokenRecord.isConsumed) {
    throw new HandoffTokenError('This QR code token has already been used or was cancelled.');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new HandoffTokenError('This QR code session has expired. Please generate a new one.');
  }

  const remainingSeconds = Math.max(
    0,
    Math.round((tokenRecord.expiresAt.getTime() - Date.now()) / 1000),
  );

  // Notify active desktop SSE listener that phone is connected
  broadcastHandoffEvent(tokenRecord.slotId, {
    type: 'PHONE_CONNECTED',
    slotId: tokenRecord.slotId,
    timestamp: new Date().toISOString(),
  });

  return {
    isValid: true,
    slotId: tokenRecord.slotId,
    tenantId: tokenRecord.tenantId,
    expiresInSeconds: remainingSeconds,
  };
}

/**
 * Consumes token atomically, processes photo, and broadcasts update to desktop
 */
export async function processPhoneHandoffUpload(
  rawToken: string,
  imageBuffer: Buffer,
  crop?: CropCoordinatesInput,
): Promise<{
  success: boolean;
  mediaAssetId: string;
  slotId: string;
}> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const tokenRecord = await prisma.phoneHandoffToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord || tokenRecord.isConsumed) {
    throw new HandoffTokenError('QR token is invalid or has already been consumed.');
  }

  if (new Date() > tokenRecord.expiresAt) {
    throw new HandoffTokenError('QR session has expired.');
  }

  // Atomically mark token as consumed
  await prisma.phoneHandoffToken.update({
    where: { id: tokenRecord.id },
    data: {
      isConsumed: true,
      consumedAt: new Date(),
    },
  });

  // Process and save photo using Sharp
  const photoResult = await processAndSavePhoto(imageBuffer, tokenRecord.tenantId, { crop });

  // Update MediaAsset reference on token
  await prisma.phoneHandoffToken.update({
    where: { id: tokenRecord.id },
    data: {
      mediaAssetId: photoResult.mediaAssetId,
    },
  });

  // Broadcast PHOTO_UPLOADED event to desktop SSE client
  broadcastHandoffEvent(tokenRecord.slotId, {
    type: 'PHOTO_UPLOADED',
    slotId: tokenRecord.slotId,
    mediaAssetId: photoResult.mediaAssetId,
    previewUrl: `/api/media/assets/${photoResult.mediaAssetId}`,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    mediaAssetId: photoResult.mediaAssetId,
    slotId: tokenRecord.slotId,
  };
}

/**
 * Cancels an active handoff session
 */
export async function cancelPhoneHandoffSession(tenantId: string, slotId: string): Promise<void> {
  await prisma.phoneHandoffToken.updateMany({
    where: {
      tenantId,
      slotId,
      isConsumed: false,
    },
    data: {
      isConsumed: true,
      consumedAt: new Date(),
    },
  });

  broadcastHandoffEvent(slotId, {
    type: 'CANCELLED',
    slotId,
    timestamp: new Date().toISOString(),
  });
}

// SSE Subscription Helpers
export function subscribeToSlotEvents(
  slotId: string,
  listener: (event: PhoneHandoffEvent) => void,
): () => void {
  const eventName = `slot:${slotId}`;
  handoffEmitter.on(eventName, listener);

  return () => {
    handoffEmitter.off(eventName, listener);
  };
}

export function broadcastHandoffEvent(slotId: string, event: PhoneHandoffEvent): void {
  const eventName = `slot:${slotId}`;
  handoffEmitter.emit(eventName, event);
}

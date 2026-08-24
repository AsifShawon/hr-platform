import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Permission, AuditAction } from '@hr/domain';
import { createPhoneHandoffTokenSchema } from '@hr/schemas';
import { prisma } from '@hr/db';
import {
  processAndSavePhoto,
  getPhotoBuffer,
  PhotoValidationError,
} from '../services/photo-processing.service.js';
import {
  createPhoneHandoffToken,
  verifyPhoneHandoffToken,
  processPhoneHandoffUpload,
  cancelPhoneHandoffSession,
  subscribeToSlotEvents,
  HandoffTokenError,
} from '../services/phone-handoff.service.js';
import { recordAuditEvent } from '../services/audit.service.js';

export const mediaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Upload Worker Photo Directly (Requires people.edit)
  fastify.post(
    '/api/people/:id/photo',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const { id: personId } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const person = await prisma.person.findUnique({
        where: { id: personId, tenantId },
      });

      if (!person) {
        return reply.status(404).send({ message: 'Worker record not found.' });
      }

      let buffer: Buffer | null = null;
      let cropOptions: any = undefined;

      if (request.isMultipart()) {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'photo') {
            buffer = await part.toBuffer();
          } else if (part.type === 'field' && part.fieldname === 'crop') {
            try {
              cropOptions = JSON.parse(part.value as string);
            } catch {
              // Ignore invalid JSON crop
            }
          }
        }
      } else {
        const body = request.body as any;
        if (body?.photoBase64) {
          const base64Data = body.photoBase64.replace(/^data:image\/\w+;base64,/, '');
          buffer = Buffer.from(base64Data, 'base64');
        }
        if (body?.crop) {
          cropOptions = body.crop;
        }
      }

      if (!buffer || buffer.length === 0) {
        return reply.status(400).send({ message: 'No photo file or data provided.' });
      }

      try {
        const result = await processAndSavePhoto(buffer, tenantId, {
          personId,
          crop: cropOptions,
        });

        await recordAuditEvent({
          tenantId,
          actorId: request.user?.id,
          action: AuditAction.PHOTO_UPLOADED,
          entityType: 'Person',
          entityId: personId,
          details: {
            mediaAssetId: result.mediaAssetId,
            fileSizeBytes: result.fileSizeBytes,
            width: result.width,
            height: result.height,
          },
          ipAddress: request.ip,
        });

        return reply.status(200).send({
          success: true,
          mediaAssetId: result.mediaAssetId,
          width: result.width,
          height: result.height,
          fileSizeBytes: result.fileSizeBytes,
          qualityReport: result.qualityReport,
        });
      } catch (err: any) {
        if (err instanceof PhotoValidationError) {
          return reply.status(400).send({ message: err.message });
        }
        request.log.error(err, 'Failed to process worker photo upload');
        return reply.status(500).send({ message: 'Internal server error processing photo.' });
      }
    },
  );

  // 2. Remove Worker Photo (Requires people.edit)
  fastify.delete(
    '/api/people/:id/photo',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const { id: personId } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const person = await prisma.person.findUnique({
        where: { id: personId, tenantId },
      });

      if (!person) {
        return reply.status(404).send({ message: 'Worker record not found.' });
      }

      await prisma.person.update({
        where: { id: personId },
        data: { photoMediaId: null },
      });

      await recordAuditEvent({
        tenantId,
        actorId: request.user?.id,
        action: AuditAction.PHOTO_REMOVED,
        entityType: 'Person',
        entityId: personId,
        ipAddress: request.ip,
      });

      return reply.status(200).send({ success: true, message: 'Photo successfully removed.' });
    },
  );

  // 3. Stream Worker Photo (Requires people.view)
  fastify.get(
    '/api/people/:id/photo',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const { id: personId } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const person = await prisma.person.findUnique({
        where: { id: personId, tenantId },
        include: { photoMedia: true },
      });

      if (!person || !person.photoMedia) {
        return reply.status(404).send({ message: 'Photo not found for this worker.' });
      }

      const storageKey =
        person.photoMedia.storageKeyCardReady || person.photoMedia.storageKeyMaster;
      const fileData = await getPhotoBuffer(storageKey, tenantId);

      if (!fileData) {
        return reply.status(404).send({ message: 'Photo file not found on disk.' });
      }

      return reply
        .header('Content-Type', fileData.mimeType)
        .header('Cache-Control', 'private, max-age=3600')
        .send(fileData.buffer);
    },
  );

  // 4. Stream Worker Avatar Thumbnail (Requires people.view)
  fastify.get(
    '/api/people/:id/photo/thumb',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const { id: personId } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      const person = await prisma.person.findUnique({
        where: { id: personId, tenantId },
        include: { photoMedia: true },
      });

      if (!person || !person.photoMedia) {
        return reply.status(404).send({ message: 'Thumbnail not found for this worker.' });
      }

      const storageKey =
        person.photoMedia.storageKeyThumbnail || person.photoMedia.storageKeyMaster;
      const fileData = await getPhotoBuffer(storageKey, tenantId);

      if (!fileData) {
        return reply.status(404).send({ message: 'Thumbnail file not found on disk.' });
      }

      return reply
        .header('Content-Type', fileData.mimeType)
        .header('Cache-Control', 'private, max-age=3600')
        .send(fileData.buffer);
    },
  );

  // 5. Stream Media Asset by ID (Requires people.view)
  fastify.get(
    '/api/media/assets/:assetId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_VIEW)],
    },
    async (request, reply) => {
      const { assetId } = request.params as { assetId: string };
      const tenantId = request.user!.tenantId;

      const mediaAsset = await prisma.mediaAsset.findUnique({
        where: { id: assetId, tenantId },
      });

      if (!mediaAsset) {
        return reply.status(404).send({ message: 'Media asset not found.' });
      }

      const storageKey = mediaAsset.storageKeyCardReady || mediaAsset.storageKeyMaster;
      const fileData = await getPhotoBuffer(storageKey, tenantId);

      if (!fileData) {
        return reply.status(404).send({ message: 'Media asset file missing on disk.' });
      }

      return reply
        .header('Content-Type', fileData.mimeType)
        .header('Cache-Control', 'private, max-age=3600')
        .send(fileData.buffer);
    },
  );

  // 6. Create Phone Handoff QR Token (Requires people.edit)
  fastify.post(
    '/api/media/handoff/create-token',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;
      const parseResult = createPhoneHandoffTokenSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply
          .status(400)
          .send({ message: 'Invalid payload', errors: parseResult.error.flatten() });
      }

      const { slotId } = parseResult.data;
      const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'http';
      const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      const tokenResponse = await createPhoneHandoffToken(tenantId, slotId, baseUrl);

      await recordAuditEvent({
        tenantId,
        actorId: request.user?.id,
        action: AuditAction.PHONE_HANDOFF_INITIATED,
        entityType: 'PhoneHandoffToken',
        entityId: tokenResponse.tokenId,
        details: { slotId },
        ipAddress: request.ip,
      });

      return reply.status(201).send(tokenResponse);
    },
  );

  // 7. Desktop Real-Time Server-Sent Events (SSE) Stream (Requires people.edit)
  fastify.get(
    '/api/media/handoff/:slotId/events',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const { slotId } = request.params as { slotId: string };

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      reply.raw.flushHeaders();

      // Send initial heartbeat
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'HEARTBEAT', slotId, timestamp: new Date().toISOString() })}\n\n`,
      );

      // Interval heartbeat to prevent proxy timeout
      const heartbeatTimer = setInterval(() => {
        if (!reply.raw.destroyed) {
          reply.raw.write(
            `data: ${JSON.stringify({ type: 'HEARTBEAT', slotId, timestamp: new Date().toISOString() })}\n\n`,
          );
        }
      }, 15000);

      // Subscribe to slot events
      const unsubscribe = subscribeToSlotEvents(slotId, (event) => {
        if (!reply.raw.destroyed) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      });

      // Cleanup on connection close
      request.raw.on('close', () => {
        clearInterval(heartbeatTimer);
        unsubscribe();
      });
    },
  );

  // 8. Mobile Phone Token Verification (Public Secure Endpoint)
  fastify.get('/api/media/handoff/verify/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      const result = await verifyPhoneHandoffToken(token);
      return reply.status(200).send(result);
    } catch (err: any) {
      if (err instanceof HandoffTokenError) {
        return reply.status(400).send({ message: err.message });
      }
      return reply.status(500).send({ message: 'Failed to verify handoff token.' });
    }
  });

  // 9. Mobile Phone Photo Upload (Public Secure Endpoint)
  fastify.post('/api/media/handoff/:token/upload', async (request, reply) => {
    const { token } = request.params as { token: string };

    let buffer: Buffer | null = null;
    let cropOptions: any = undefined;

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'photo') {
          buffer = await part.toBuffer();
        } else if (part.type === 'field' && part.fieldname === 'crop') {
          try {
            cropOptions = JSON.parse(part.value as string);
          } catch {
            // Ignore
          }
        }
      }
    } else {
      const body = request.body as any;
      if (body?.photoBase64) {
        const base64Data = body.photoBase64.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      }
      if (body?.crop) {
        cropOptions = body.crop;
      }
    }

    if (!buffer || buffer.length === 0) {
      return reply.status(400).send({ message: 'No photo data provided.' });
    }

    try {
      const result = await processPhoneHandoffUpload(token, buffer, cropOptions);
      return reply.status(200).send({
        success: true,
        message: 'Photo successfully uploaded and transferred to desktop workspace.',
        mediaAssetId: result.mediaAssetId,
      });
    } catch (err: any) {
      if (err instanceof HandoffTokenError || err instanceof PhotoValidationError) {
        return reply.status(400).send({ message: err.message });
      }
      request.log.error(err, 'Failed to process phone photo handoff upload');
      return reply.status(500).send({ message: 'Failed to process photo.' });
    }
  });

  // 10. Cancel Phone Handoff Slot (Requires people.edit)
  fastify.post(
    '/api/media/handoff/:slotId/cancel',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.PEOPLE_EDIT)],
    },
    async (request, reply) => {
      const { slotId } = request.params as { slotId: string };
      const tenantId = request.user!.tenantId;

      await cancelPhoneHandoffSession(tenantId, slotId);
      return reply.status(200).send({ success: true, message: 'Handoff session cancelled.' });
    },
  );
};

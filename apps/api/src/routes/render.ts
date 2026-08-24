import { FastifyPluginAsync } from 'fastify';
import { Permission } from '@hr/domain';
import { CardRenderer } from '@hr/worker';
import { z } from '@hr/schemas';

const renderPdfRequestSchema = z.object({
  layout: z.any(),
  worker: z.object({
    displayName: z.string(),
    displayNameLatin: z.string().nullable().optional(),
    displayNameNative: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    employeeNumber: z.string(),
    bloodGroup: z.string().nullable().optional(),
    joinDate: z.string().nullable().optional(),
    emergencyContact: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    orgName: z.string().nullable().optional(),
    orgNameBangla: z.string().nullable().optional(),
    serialNumber: z.string().nullable().optional(),
  }),
  side: z.enum(['front', 'back', 'duplex']).optional().default('duplex'),
  includeBleed: z.boolean().optional().default(false),
  debugMode: z.boolean().optional().default(false),
});

const renderPngRequestSchema = z.object({
  layout: z.any(),
  worker: z.object({
    displayName: z.string(),
    displayNameLatin: z.string().nullable().optional(),
    displayNameNative: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    employeeNumber: z.string(),
    bloodGroup: z.string().nullable().optional(),
    joinDate: z.string().nullable().optional(),
    emergencyContact: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    orgName: z.string().nullable().optional(),
    orgNameBangla: z.string().nullable().optional(),
    serialNumber: z.string().nullable().optional(),
  }),
  side: z.enum(['front', 'back']).optional().default('front'),
  dpi: z
    .union([z.literal(150), z.literal(300), z.literal(600)])
    .optional()
    .default(300),
  includeBleed: z.boolean().optional().default(false),
});

export const renderRoutes: FastifyPluginAsync = async (server) => {
  const renderer = new CardRenderer();

  // 1. POST /api/cards/render/preview-pdf - Render exact-size physical PDF
  server.post(
    '/api/cards/render/preview-pdf',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)] },
    async (request, reply) => {
      const parsed = renderPdfRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const result = await renderer.renderCardPdf(parsed.data as any);
        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', 'inline; filename="card-print-master.pdf"')
          .header('X-Checksum-SHA256', result.checksumSha256)
          .send(result.buffer);
      } catch (err: any) {
        request.log.error({ err }, 'Error generating card PDF');
        return reply.status(500).send({ error: err.message || 'PDF render failed.' });
      }
    },
  );

  // 2. POST /api/cards/render/preview-png - Render high-res PNG
  server.post(
    '/api/cards/render/preview-png',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)] },
    async (request, reply) => {
      const parsed = renderPngRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      try {
        const result = await renderer.renderCardPng(parsed.data as any);
        return reply
          .header('Content-Type', 'image/png')
          .header('Content-Disposition', 'inline; filename="card-preview.png"')
          .header('X-Checksum-SHA256', result.checksumSha256)
          .send(result.buffer);
      } catch (err: any) {
        request.log.error({ err }, 'Error generating card PNG');
        return reply.status(500).send({ error: err.message || 'PNG render failed.' });
      }
    },
  );

  // 3. GET /api/cards/calibration/pdf - Download printer calibration PDF
  server.get(
    '/api/cards/calibration/pdf',
    { preHandler: [server.authenticate, server.requirePermission(Permission.CARDS_PRINT)] },
    async (request, reply) => {
      const query = request.query as { sheet?: 'A4' | 'LETTER' };
      const sheet = query.sheet === 'LETTER' ? 'LETTER' : 'A4';

      try {
        const result = await renderer.renderCalibrationPdf(sheet);
        return reply
          .header('Content-Type', 'application/pdf')
          .header(
            'Content-Disposition',
            `attachment; filename="printer-calibration-${sheet.toLowerCase()}.pdf"`,
          )
          .header('X-Checksum-SHA256', result.checksumSha256)
          .send(result.buffer);
      } catch (err: any) {
        request.log.error({ err }, 'Error generating calibration PDF');
        return reply.status(500).send({ error: err.message || 'Calibration PDF render failed.' });
      }
    },
  );
};

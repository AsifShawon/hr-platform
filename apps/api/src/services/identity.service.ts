import { prisma } from '@hr/db';
import { IdentityDocumentType, AuditAction } from '@hr/domain';
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
  hashForBlindIndex,
  maskSensitiveIdentifier,
} from './crypto.service.js';
import { recordAuditEvent } from './audit.service.js';

export class IdentityDocumentNotFoundError extends Error {
  constructor(id: string) {
    super(`Identity document with ID '${id}' was not found.`);
    this.name = 'IdentityDocumentNotFoundError';
  }
}

export interface UpsertIdentityDocumentInput {
  documentType: IdentityDocumentType;
  country?: string;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  isVerified?: boolean;
}

/**
 * Creates or updates an identity document for a person.
 */
export async function upsertIdentityDocument(
  tenantId: string,
  personId: string,
  input: UpsertIdentityDocumentInput,
) {
  const rawNumber = input.documentNumber.trim();
  const documentNumberEncrypted = encryptSensitiveValue(rawNumber);
  const documentNumberMasked = maskSensitiveIdentifier(rawNumber);
  const documentNumberHash = hashForBlindIndex(rawNumber, tenantId);

  // Check if an existing document of this type exists for the person
  const existing = await prisma.identityDocument.findFirst({
    where: {
      tenantId,
      personId,
      documentType: input.documentType,
    },
  });

  if (existing) {
    return await prisma.identityDocument.update({
      where: { id: existing.id },
      data: {
        country: input.country || 'BGD',
        documentNumberEncrypted,
        documentNumberMasked,
        documentNumberHash,
        issueDate: input.issueDate ? new Date(input.issueDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        isVerified: input.isVerified ?? existing.isVerified,
      },
    });
  }

  return await prisma.identityDocument.create({
    data: {
      tenantId,
      personId,
      documentType: input.documentType,
      country: input.country || 'BGD',
      documentNumberEncrypted,
      documentNumberMasked,
      documentNumberHash,
      issueDate: input.issueDate ? new Date(input.issueDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      isVerified: input.isVerified ?? false,
    },
  });
}

/**
 * Reveals the decrypted government document number and logs an immutable audit event.
 */
export async function revealIdentityDocument(
  tenantId: string,
  documentId: string,
  actorId: string,
  ipAddress?: string,
) {
  const doc = await prisma.identityDocument.findFirst({
    where: { id: documentId, tenantId },
    include: {
      person: { select: { id: true, displayName: true } },
    },
  });

  if (!doc) {
    throw new IdentityDocumentNotFoundError(documentId);
  }

  // Decrypt document number
  const plaintext = decryptSensitiveValue(doc.documentNumberEncrypted);

  // Record audit log for reveal event
  await recordAuditEvent({
    tenantId,
    actorId,
    action: AuditAction.IDENTITY_REVEALED,
    entityType: 'identity_document',
    entityId: doc.id,
    ipAddress,
    details: {
      personId: doc.personId,
      personName: doc.person.displayName,
      documentType: doc.documentType,
      documentNumberMasked: doc.documentNumberMasked,
      revealedAt: new Date().toISOString(),
    },
  });

  return {
    documentId: doc.id,
    documentType: doc.documentType,
    documentNumber: plaintext,
    revealedAt: new Date().toISOString(),
    expiresInSeconds: 30,
  };
}

/**
 * Deletes an identity document.
 */
export async function deleteIdentityDocument(tenantId: string, documentId: string) {
  const existing = await prisma.identityDocument.findFirst({
    where: { id: documentId, tenantId },
  });

  if (!existing) {
    throw new IdentityDocumentNotFoundError(documentId);
  }

  await prisma.identityDocument.delete({
    where: { id: documentId },
  });

  return { success: true };
}

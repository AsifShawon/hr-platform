import { hash, verify } from '@node-rs/argon2';
import crypto from 'node:crypto';
import { prisma, User, Session, PermissionType } from '@hr/db';
import { Permission, SESSION_IDLE_TIMEOUT_MS, SESSION_ABSOLUTE_TIMEOUT_MS } from '@hr/domain';

// Argon2id configuration complying with OWASP guidelines
export const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3, // 3 iterations
  outputLen: 32, // 32 bytes
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export async function createSession(
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<{ token: string; session: Session }> {
  const { token, tokenHash } = generateOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      lastActiveAt: now,
      expiresAt,
    },
  });

  return { token, session };
}

export interface ResolvedAuthContext {
  session: Session;
  user: User & {
    roles: Array<{ id: string; name: string; isBuiltIn: boolean; permissions: PermissionType[] }>;
  };
  permissions: Permission[];
  isActivated: boolean;
}

export async function validateSession(token: string): Promise<ResolvedAuthContext | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          roleGrants: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  // Check absolute ceiling
  const createdAt = session.createdAt.getTime();
  if (now.getTime() - createdAt > SESSION_ABSOLUTE_TIMEOUT_MS) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Check sliding idle expiration
  if (session.expiresAt.getTime() < now.getTime()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Check user active status
  if (!session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Slide idle expiration (update lastActiveAt & expiresAt)
  const newExpiresAt = new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: now,
      expiresAt: newExpiresAt,
    },
  });

  // Check system installation activation state
  const installation = await prisma.systemInstallation.findFirst();
  const isActivated = installation?.isActivated ?? false;

  // Resolve distinct permissions across all granted roles
  const roles = session.user.roleGrants.map((rg) => rg.role);
  const permissionSet = new Set<Permission>();
  for (const role of roles) {
    for (const p of role.permissions) {
      permissionSet.add(p as unknown as Permission);
    }
  }

  return {
    session,
    user: {
      ...session.user,
      roles,
    },
    permissions: Array.from(permissionSet),
    isActivated,
  };
}

export async function rotateSession(
  oldToken: string,
  userId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<{ token: string; session: Session }> {
  if (oldToken) {
    const oldTokenHash = hashToken(oldToken);
    await prisma.session.deleteMany({ where: { tokenHash: oldTokenHash } }).catch(() => {});
  }
  return createSession(userId, ipAddress, userAgent);
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });
  return result.count > 0;
}

export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string,
): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId },
    },
  });
  return result.count;
}

// ==============================================================================
// Recovery Codes Generator & Verification
// ==============================================================================

export function generateRecoveryCodes(count = 8): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 alphanumeric chars
    plainCodes.push(code);
    hashedCodes.push(hashToken(code));
  }

  return { plainCodes, hashedCodes };
}

export async function saveRecoveryCodes(userId: string, hashedCodes: string[]): Promise<void> {
  // Clear any existing recovery codes for user
  await prisma.recoveryCode.deleteMany({ where: { userId } });

  await prisma.recoveryCode.createMany({
    data: hashedCodes.map((codeHash) => ({
      userId,
      codeHash,
    })),
  });
}

export async function verifyAndConsumeRecoveryCode(
  userId: string,
  plainCode: string,
): Promise<boolean> {
  const codeHash = hashToken(plainCode.trim().toUpperCase());
  const match = await prisma.recoveryCode.findFirst({
    where: {
      userId,
      codeHash,
      usedAt: null,
    },
  });

  if (!match) return false;

  await prisma.recoveryCode.update({
    where: { id: match.id },
    data: { usedAt: new Date() },
  });

  return true;
}

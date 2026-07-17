export { PrismaClient } from '../generated/prisma/client';

export type {
  User,
  Account,
  Session,
  Verification,
  Passkey,
  Package,
  Role,
  Permission,
  RoleAssignment,
  ResourceAccess,
  AuthAuditLog,
  RegistrationType,
  AccessType,
  AuditAction,
} from '../generated/prisma/client';

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Shared Prisma client factory for consumers that want their own instance.
 * Most consumers should import `prisma` from `@jazzmind/auth/lib` instead
 * so they share the package's singleton.
 */
export const createSharedPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
};

/**
 * Smoke-test that the auth schema is reachable. Returns false if the `user`
 * table is missing (e.g. `prisma db push` has not been run).
 */
export const ensureAuthSchema = async (
  prisma: InstanceType<typeof PrismaClient>,
): Promise<boolean> => {
  try {
    await prisma.user.findFirst();
    return true;
  } catch (error) {
    console.error('[@jazzmind/auth/prisma] Auth schema not reachable:', error);
    return false;
  }
};

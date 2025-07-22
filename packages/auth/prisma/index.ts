import { PrismaClient } from '@prisma/client';
// Export Prisma client and schema for other packages
export { PrismaClient } from '@prisma/client';

// Export commonly used Prisma types
export type {
  User,
  Account,
  Session,
  Package,
  Role,
  Permission,
  RoleAssignment,
  ResourceAccess,
  AuthAuditLog,
  Authenticator,
  PasskeyChallenge,
  RegistrationType,
  AccessType,
  AuditAction
} from '@prisma/client';

// Create a shared Prisma client instance
export const createSharedPrismaClient = () => {
  return new PrismaClient({
    // Add any shared configuration here
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

// Database utilities
export const ensureAuthSchema = async (prisma: any) => {
  // This could check if auth tables exist and create them if needed
  // For now, assumes schema is already applied via migrations
  try {
    await prisma.user.findFirst();
    return true;
  } catch (error) {
    console.error('Auth schema not found:', error);
    return false;
  }
}; 
import type { NextRequest } from 'next/server';

/**
 * Admin check based ONLY on the configured `ADMIN_USERS` env variable.
 * Prefer `session.user.role === 'admin'` where possible; keep this helper
 * for paths where a session isn't available (background jobs, seeds).
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const adminUsers = (process.env.ADMIN_USERS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminUsers.includes(email.toLowerCase());
};

/**
 * Shared Prisma client for legacy consumers. New code should import `prisma`
 * from '@jazzmind/auth' (internal) or their own `@/lib/db` helper.
 */
export const createPrismaClient = async () => {
  const { prisma } = await import('../src/db');
  return prisma;
};

export { prisma } from '../src/db';

/**
 * Check whether a user has any active access grant for the given package.
 */
export async function hasPackageAccess(
  userId: string,
  packageName: string,
): Promise<boolean> {
  const { prisma } = await import('../src/db');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, banned: true },
  });
  if (!user || user.banned) return false;
  if (user.role === 'admin') return true;
  if (isAdmin(user.email)) return true;

  const pkg = await prisma.package.findUnique({
    where: { name: packageName },
    select: { id: true, isActive: true },
  });
  if (!pkg || !pkg.isActive) return false;

  const [roleCount, accessCount] = await Promise.all([
    prisma.roleAssignment.count({
      where: {
        userId,
        packageId: pkg.id,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
    prisma.resourceAccess.count({
      where: {
        userId,
        packageId: pkg.id,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    }),
  ]);

  return roleCount + accessCount > 0;
}

/**
 * Resolve the current session on the server side. Thin wrapper around
 * `auth.api.getSession` that accepts either a `NextRequest` or raw `Headers`.
 */
export async function getServerSession(input: NextRequest | Headers) {
  const { auth } = await import('../src/auth');
  const headers = input instanceof Headers ? input : input.headers;
  return auth.api.getSession({ headers });
}

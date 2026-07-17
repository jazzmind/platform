import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db';
import { requireAdmin } from '@/guards';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  let isInitialized = false;
  try {
    const packageCount = await prisma.package.count();
    if (packageCount === 0) {
      isInitialized = false;
    } else {
      const meetingsPackage = await prisma.package.findUnique({
        where: { name: 'meetings' },
        include: { roles: true, permissions: true },
      });
      isInitialized = Boolean(
        meetingsPackage &&
          meetingsPackage.roles.length > 0 &&
          meetingsPackage.permissions.length > 0,
      );
    }
  } catch (error) {
    console.warn('[admin/status] DB query failed:', error);
    isInitialized = false;
  }

  return NextResponse.json({
    isInitialized,
    adminEmail: guard.email,
  });
}

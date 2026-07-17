import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db';
import { requireAdmin } from '@/guards';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystemRole: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ roles });
  } catch (error) {
    console.warn('[admin/roles] DB query failed:', error);
    return NextResponse.json({ roles: [] });
  }
}

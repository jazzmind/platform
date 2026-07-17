import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db';
import { requireAdmin } from '@/guards';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ packages });
  } catch (error) {
    console.warn('[admin/packages] DB query failed:', error);
    return NextResponse.json({ packages: [] });
  }
}

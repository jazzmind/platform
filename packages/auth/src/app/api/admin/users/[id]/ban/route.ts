import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireAdmin } from '@/guards';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  try {
    await auth.api.banUser({
      body: { userId: id },
      headers: req.headers,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/users/:id/ban] failed:', error);
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
  }
}

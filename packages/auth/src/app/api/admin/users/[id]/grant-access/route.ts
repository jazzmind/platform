import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/db';
import { requireAdmin } from '@/guards';

const bodySchema = z.object({
  packageId: z.string().min(1),
  accessType: z
    .enum(['OWNER', 'EDITOR', 'VIEWER', 'LIMITED_EDITOR', 'COLLABORATOR', 'CUSTOM'])
    .optional()
    .default('VIEWER'),
  resourceType: z.string().optional().default('package'),
  resourceId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { id: userId } = await params;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: 'Invalid body', details: String(error) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const pkg = await prisma.package.findUnique({ where: { id: body.packageId } });
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  try {
    const resourceId = body.resourceId ?? pkg.id;
    const access = await prisma.resourceAccess.upsert({
      where: {
        userId_packageId_resourceType_resourceId_accessType: {
          userId,
          packageId: pkg.id,
          resourceType: body.resourceType,
          resourceId,
          accessType: body.accessType,
        },
      },
      update: { isActive: true, grantedBy: guard.session.user.id },
      create: {
        userId,
        packageId: pkg.id,
        resourceType: body.resourceType,
        resourceId,
        accessType: body.accessType,
        grantedBy: guard.session.user.id,
      },
    });

    await prisma.authAuditLog.create({
      data: {
        userId: guard.session.user.id,
        targetUserId: userId,
        packageId: pkg.id,
        action: 'RESOURCE_ACCESS_GRANTED',
        resourceType: body.resourceType,
        resourceId,
        details: { accessType: body.accessType },
      },
    });

    return NextResponse.json({ success: true, access });
  } catch (error) {
    console.error('[admin/users/:id/grant-access] failed:', error);
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }
}

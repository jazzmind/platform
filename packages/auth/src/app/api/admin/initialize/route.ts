import { type NextRequest, NextResponse } from 'next/server';
import { RegistrationType } from '../../../../../generated/prisma/client';
import { prisma } from '@/db';
import { requireAdmin } from '@/guards';

const DEFAULT_PACKAGES = [
  {
    name: 'meetings',
    displayName: 'Meeting Scheduler',
    description: 'Schedule and manage meetings with participants',
    registrationType: RegistrationType.APPROVAL_REQUIRED,
  },
  {
    name: 'presentations',
    displayName: 'Presentations',
    description: 'Create and manage presentations',
    registrationType: RegistrationType.SELF_REGISTER,
  },
  {
    name: 'events',
    displayName: 'Events',
    description: 'Event management and coordination',
    registrationType: RegistrationType.SELF_REGISTER,
  },
] as const;

const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    displayName: 'System Administrator',
    description: 'Full system access and management',
    isSystemRole: true,
  },
  {
    name: 'USER',
    displayName: 'User',
    description: 'Basic user access',
    isSystemRole: true,
  },
] as const;

const MEETINGS_PERMISSIONS = [
  { name: 'meeting:read', displayName: 'View Meetings', description: 'View meetings and their details', category: 'read' },
  { name: 'meeting:write', displayName: 'Create/Edit Meetings', description: 'Create new meetings and edit existing ones', category: 'write' },
  { name: 'meeting:delete', displayName: 'Delete Meetings', description: 'Delete meetings', category: 'admin' },
  { name: 'meeting:manage', displayName: 'Manage Meetings', description: 'Full meeting management including participants', category: 'admin' },
  { name: 'meeting:book', displayName: 'Book Meeting Times', description: 'Book available time slots for meetings', category: 'write' },
] as const;

const MEETINGS_ROLES = [
  { name: 'ADMIN', displayName: 'Meetings Administrator', description: 'Full meeting management access', permissions: ['meeting:read', 'meeting:write', 'meeting:delete', 'meeting:manage', 'meeting:book'] },
  { name: 'USER', displayName: 'Meeting User', description: 'Basic meeting access', permissions: ['meeting:read', 'meeting:book'] },
  { name: 'ORGANIZER', displayName: 'Meeting Organizer', description: 'Can create and manage own meetings', permissions: ['meeting:read', 'meeting:write', 'meeting:manage', 'meeting:book'] },
] as const;

async function setupMeetingsPackage(): Promise<void> {
  const meetingsPackage = await prisma.package.findUnique({ where: { name: 'meetings' } });
  if (!meetingsPackage) throw new Error('Meetings package not found');

  const permissionIds = new Map<string, string>();
  for (const permData of MEETINGS_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { name_packageId: { name: permData.name, packageId: meetingsPackage.id } },
      update: {},
      create: { ...permData, packageId: meetingsPackage.id },
    });
    permissionIds.set(permData.name, permission.id);
  }

  for (const roleData of MEETINGS_ROLES) {
    const role = await prisma.role.upsert({
      where: { name_packageId: { name: roleData.name, packageId: meetingsPackage.id } },
      update: {},
      create: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        packageId: meetingsPackage.id,
        isSystemRole: false,
      },
    });

    for (const permissionName of roleData.permissions) {
      const permissionId = permissionIds.get(permissionName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    // Create system-wide roles (packageId is null for system roles per schema).
    for (const roleData of DEFAULT_SYSTEM_ROLES) {
      const existing = await prisma.role.findFirst({
        where: { name: roleData.name, packageId: null, isSystemRole: true },
      });
      if (!existing) {
        await prisma.role.create({
          data: {
            name: roleData.name,
            displayName: roleData.displayName,
            description: roleData.description,
            isSystemRole: true,
            packageId: null,
          },
        });
      }
    }

    // Create / upsert packages
    for (const packageData of DEFAULT_PACKAGES) {
      await prisma.package.upsert({
        where: { name: packageData.name },
        update: {},
        create: packageData,
      });
    }

    await setupMeetingsPackage();

    return NextResponse.json({
      success: true,
      message: 'Authorization system initialized successfully',
    });
  } catch (error) {
    console.error('[admin/initialize] failed:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authorization system' },
      { status: 500 },
    );
  }
}

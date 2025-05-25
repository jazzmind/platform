import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default system configuration
const DEFAULT_PACKAGES = [
  {
    name: 'meetings',
    displayName: 'Meeting Scheduler',
    description: 'Schedule and manage meetings with participants',
    registrationType: 'APPROVAL_REQUIRED'
  },
  {
    name: 'presentations',
    displayName: 'Presentations',
    description: 'Create and manage presentations',
    registrationType: 'SELF_REGISTER'
  },
  {
    name: 'events',
    displayName: 'Events',
    description: 'Event management and coordination',
    registrationType: 'SELF_REGISTER'
  }
];

const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    displayName: 'System Administrator',
    description: 'Full system access and management',
    isSystemRole: true
  },
  {
    name: 'USER',
    displayName: 'User',
    description: 'Basic user access',
    isSystemRole: true
  }
];

const MEETINGS_PERMISSIONS = [
  {
    name: 'meeting:read',
    displayName: 'View Meetings',
    description: 'View meetings and their details',
    category: 'read'
  },
  {
    name: 'meeting:write',
    displayName: 'Create/Edit Meetings',
    description: 'Create new meetings and edit existing ones',
    category: 'write'
  },
  {
    name: 'meeting:delete',
    displayName: 'Delete Meetings',
    description: 'Delete meetings',
    category: 'admin'
  },
  {
    name: 'meeting:manage',
    displayName: 'Manage Meetings',
    description: 'Full meeting management including participants',
    category: 'admin'
  },
  {
    name: 'meeting:book',
    displayName: 'Book Meeting Times',
    description: 'Book available time slots for meetings',
    category: 'write'
  }
];

const MEETINGS_ROLES = [
  {
    name: 'ADMIN',
    displayName: 'Meetings Administrator',
    description: 'Full meeting management access',
    permissions: ['meeting:read', 'meeting:write', 'meeting:delete', 'meeting:manage', 'meeting:book']
  },
  {
    name: 'USER',
    displayName: 'Meeting User',
    description: 'Basic meeting access',
    permissions: ['meeting:read', 'meeting:book']
  },
  {
    name: 'ORGANIZER',
    displayName: 'Meeting Organizer',
    description: 'Can create and manage own meetings',
    permissions: ['meeting:read', 'meeting:write', 'meeting:manage', 'meeting:book']
  }
];

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminUsers = process.env.ADMIN_USERS?.split(',').map(email => email.trim()) || [];
    if (!adminUsers.includes(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔐 Setting up authorization system...');

    // 1. Create system roles
    console.log('  → Creating system roles...');
    for (const roleData of DEFAULT_SYSTEM_ROLES) {
      await prisma.role.upsert({
        where: {
          name_packageId: {
            name: roleData.name,
            packageId: null
          }
        },
        update: {},
        create: roleData
      });
    }

    // 2. Create packages
    console.log('  → Creating packages...');
    for (const packageData of DEFAULT_PACKAGES) {
      await prisma.package.upsert({
        where: { name: packageData.name },
        update: {},
        create: packageData
      });
    }

    // 3. Setup meetings package specifically
    await setupMeetingsPackage();

    console.log('✅ Authorization system setup complete!');

    return NextResponse.json({ 
      success: true,
      message: 'Authorization system initialized successfully'
    });
  } catch (error) {
    console.error('❌ Failed to setup authorization system:', error);
    return NextResponse.json(
      { error: 'Failed to initialize authorization system' }, 
      { status: 500 }
    );
  }
}

async function setupMeetingsPackage() {
  console.log('  → Setting up meetings package...');

  // Get meetings package
  const meetingsPackage = await prisma.package.findUnique({
    where: { name: 'meetings' }
  });

  if (!meetingsPackage) {
    throw new Error('Meetings package not found');
  }

  // Create permissions
  console.log('    → Creating permissions...');
  const permissionIds = new Map<string, string>();
  
  for (const permData of MEETINGS_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: {
        name_packageId: {
          name: permData.name,
          packageId: meetingsPackage.id
        }
      },
      update: {},
      create: {
        ...permData,
        packageId: meetingsPackage.id
      }
    });
    permissionIds.set(permData.name, permission.id);
  }

  // Create roles and assign permissions
  console.log('    → Creating roles...');
  for (const roleData of MEETINGS_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        name_packageId: {
          name: roleData.name,
          packageId: meetingsPackage.id
        }
      },
      update: {},
      create: {
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
        packageId: meetingsPackage.id,
        isSystemRole: false
      }
    });

    // Assign permissions to role
    for (const permissionName of roleData.permissions) {
      const permissionId = permissionIds.get(permissionName);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId
          }
        });
      }
    }
  }

  console.log('    ✅ Meetings package setup complete!');
} 
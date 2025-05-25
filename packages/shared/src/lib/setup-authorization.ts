// Authorization system setup and initialization
import { RegistrationType, AccessType, AuditAction } from '../types';

// Default system configuration
export const DEFAULT_PACKAGES = [
  {
    name: 'meetings',
    displayName: 'Meeting Scheduler',
    description: 'Schedule and manage meetings with participants',
    registrationType: RegistrationType.APPROVAL_REQUIRED
  },
  {
    name: 'presentations',
    displayName: 'Presentations',
    description: 'Create and manage presentations',
    registrationType: RegistrationType.SELF_REGISTER
  },
  {
    name: 'events',
    displayName: 'Events',
    description: 'Event management and coordination',
    registrationType: RegistrationType.SELF_REGISTER
  }
];

export const DEFAULT_SYSTEM_ROLES = [
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

export const MEETINGS_PERMISSIONS = [
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

export const MEETINGS_ROLES = [
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

// Setup interface
export interface AuthorizationSetup {
  prisma: any;
  verbose?: boolean;
}

/**
 * Initialize authorization system with default data
 */
export async function setupAuthorizationSystem({ prisma, verbose = false }: AuthorizationSetup): Promise<void> {
  try {
    if (verbose) console.log('🔐 Setting up authorization system...');

    // 1. Create system roles
    if (verbose) console.log('  → Creating system roles...');
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
    if (verbose) console.log('  → Creating packages...');
    for (const packageData of DEFAULT_PACKAGES) {
      await prisma.package.upsert({
        where: { name: packageData.name },
        update: {},
        create: packageData
      });
    }

    // 3. Setup meetings package specifically
    await setupMeetingsPackage({ prisma, verbose });

    if (verbose) console.log('✅ Authorization system setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup authorization system:', error);
    throw error;
  }
}

/**
 * Setup meetings package with roles and permissions
 */
export async function setupMeetingsPackage({ prisma, verbose = false }: AuthorizationSetup): Promise<void> {
  try {
    if (verbose) console.log('  → Setting up meetings package...');

    // Get meetings package
    const meetingsPackage = await prisma.package.findUnique({
      where: { name: 'meetings' }
    });

    if (!meetingsPackage) {
      throw new Error('Meetings package not found');
    }

    // Create permissions
    if (verbose) console.log('    → Creating permissions...');
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
    if (verbose) console.log('    → Creating roles...');
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

    if (verbose) console.log('    ✅ Meetings package setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup meetings package:', error);
    throw error;
  }
}

/**
 * Grant meeting owner access when a meeting is created
 */
export async function grantMeetingOwnership(
  prisma: any,
  userId: string,
  meetingId: string,
  grantedBy?: string
): Promise<void> {
  try {
    // Get meetings package
    const meetingsPackage = await prisma.package.findUnique({
      where: { name: 'meetings' }
    });

    if (!meetingsPackage) {
      throw new Error('Meetings package not found');
    }

    // Grant owner access
    await prisma.resourceAccess.create({
      data: {
        userId,
        packageId: meetingsPackage.id,
        resourceType: 'meeting',
        resourceId: meetingId,
        accessType: AccessType.OWNER,
        grantedBy: grantedBy || userId,
        metadata: {
          reason: 'Meeting creator',
          grantedAt: new Date().toISOString()
        }
      }
    });

    // Audit log
    await prisma.authAuditLog.create({
      data: {
        userId: grantedBy || userId,
        targetUserId: userId,
        packageId: meetingsPackage.id,
        action: AuditAction.RESOURCE_ACCESS_GRANTED,
        resourceType: 'meeting',
        resourceId: meetingId,
        details: {
          accessType: AccessType.OWNER,
          reason: 'Meeting creator ownership'
        }
      }
    });
  } catch (error) {
    console.error('Error granting meeting ownership:', error);
    throw error;
  }
}

/**
 * Grant specific access to a meeting
 */
export async function grantMeetingAccess(
  prisma: any,
  userId: string,
  meetingId: string,
  accessType: AccessType,
  grantedBy: string
): Promise<void> {
  try {
    // Get meetings package
    const meetingsPackage = await prisma.package.findUnique({
      where: { name: 'meetings' }
    });

    if (!meetingsPackage) {
      throw new Error('Meetings package not found');
    }

    // Grant access
    await prisma.resourceAccess.upsert({
      where: {
        userId_packageId_resourceType_resourceId_accessType: {
          userId,
          packageId: meetingsPackage.id,
          resourceType: 'meeting',
          resourceId: meetingId,
          accessType
        }
      },
      update: {
        grantedBy,
        isActive: true,
        metadata: {
          updatedAt: new Date().toISOString(),
          grantedBy
        }
      },
      create: {
        userId,
        packageId: meetingsPackage.id,
        resourceType: 'meeting',
        resourceId: meetingId,
        accessType,
        grantedBy,
        metadata: {
          grantedAt: new Date().toISOString(),
          grantedBy
        }
      }
    });

    // Audit log
    await prisma.authAuditLog.create({
      data: {
        userId: grantedBy,
        targetUserId: userId,
        packageId: meetingsPackage.id,
        action: AuditAction.RESOURCE_ACCESS_GRANTED,
        resourceType: 'meeting',
        resourceId: meetingId,
        details: {
          accessType,
          grantedBy
        }
      }
    });
  } catch (error) {
    console.error('Error granting meeting access:', error);
    throw error;
  }
}

/**
 * Revoke access to a meeting
 */
export async function revokeMeetingAccess(
  prisma: any,
  userId: string,
  meetingId: string,
  accessType: AccessType,
  revokedBy: string
): Promise<void> {
  try {
    // Get meetings package
    const meetingsPackage = await prisma.package.findUnique({
      where: { name: 'meetings' }
    });

    if (!meetingsPackage) {
      throw new Error('Meetings package not found');
    }

    // Revoke access
    await prisma.resourceAccess.updateMany({
      where: {
        userId,
        packageId: meetingsPackage.id,
        resourceType: 'meeting',
        resourceId: meetingId,
        accessType,
        isActive: true
      },
      data: {
        isActive: false,
        metadata: {
          revokedAt: new Date().toISOString(),
          revokedBy
        }
      }
    });

    // Audit log
    await prisma.authAuditLog.create({
      data: {
        userId: revokedBy,
        targetUserId: userId,
        packageId: meetingsPackage.id,
        action: AuditAction.RESOURCE_ACCESS_REVOKED,
        resourceType: 'meeting',
        resourceId: meetingId,
        details: {
          accessType,
          revokedBy
        }
      }
    });
  } catch (error) {
    console.error('Error revoking meeting access:', error);
    throw error;
  }
}

/**
 * Check if authorization system is properly initialized
 */
export async function checkAuthorizationSetup(prisma: any): Promise<boolean> {
  try {
    // Check if packages exist
    const packageCount = await prisma.package.count();
    if (packageCount === 0) return false;

    // Check if meetings package has roles and permissions
    const meetingsPackage = await prisma.package.findUnique({
      where: { name: 'meetings' },
      include: {
        roles: true,
        permissions: true
      }
    });

    return !!(
      meetingsPackage &&
      meetingsPackage.roles.length > 0 &&
      meetingsPackage.permissions.length > 0
    );
  } catch (error) {
    console.error('Error checking authorization setup:', error);
    return false;
  }
} 
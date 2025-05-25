// Core authorization engine for the platform
import {
  type AuthorizationContext,
  type AuthorizationResult,
  type PermissionCheck,
  type UserPermissions,
  type AccessType,
  type GrantRoleRequest,
  type GrantAccessRequest,
  type PackageAccessRequest,
  type MeetingPermissions,
  RegistrationType,
  AuditAction
} from '../types';

// Type definitions for Prisma query results
interface RoleAssignmentWithRole {
  role: {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    packageId?: string;
    isSystemRole: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{
      permission: {
        id: string;
        name: string;
        displayName: string;
        description?: string;
        packageId: string;
        category?: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }>;
  };
}

interface ResourceAccessRecord {
  id: string;
  userId: string;
  packageId: string;
  resourceType: string;
  resourceId: string;
  accessType: AccessType;
  grantedBy?: string;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Cache interface for permission caching
interface PermissionCache {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Simple in-memory cache implementation
class MemoryCache implements PermissionCache {
  private cache = new Map<string, { value: any; expires: number }>();

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Permission engine configuration
interface AuthorizationConfig {
  cache?: PermissionCache;
  cacheTTL?: number;
  enableAuditLogging?: boolean;
  prismaClient?: any; // Will be injected
}

export class AuthorizationEngine {
  private cache: PermissionCache;
  private cacheTTL: number;
  private enableAuditLogging: boolean;
  private prisma: any;

  constructor(config: AuthorizationConfig = {}) {
    this.cache = config.cache || new MemoryCache();
    this.cacheTTL = config.cacheTTL || 300; // 5 minutes default
    this.enableAuditLogging = config.enableAuditLogging ?? true;
    this.prisma = config.prismaClient;
  }

  // Set Prisma client (for dependency injection)
  setPrismaClient(prisma: any): void {
    this.prisma = prisma;
  }

  // ============================================================================
  // PERMISSION CHECKING
  // ============================================================================

  /**
   * Check if user has permission to perform an action
   */
  async checkPermission(context: AuthorizationContext): Promise<AuthorizationResult> {
    const cacheKey = this.buildPermissionCacheKey(context);
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.evaluatePermission(context);
      
      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      console.error('Error checking permission:', error);
      return {
        allowed: false,
        permissions: [],
        roles: [],
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Get user's complete permissions for a package
   */
  async getUserPermissions(userId: string, packageId: string): Promise<UserPermissions> {
    const cacheKey = `user_permissions:${userId}:${packageId}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get user's role assignments for this package
      const roleAssignments = await this.prisma.roleAssignment.findMany({
        where: {
          userId,
          packageId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      // Get direct resource access
      const resourceAccess = await this.prisma.resourceAccess.findMany({
        where: {
          userId,
          packageId,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      // Check if user is system admin
      const systemAdminRole = await this.prisma.roleAssignment.findFirst({
        where: {
          userId,
          role: {
            isSystemRole: true,
            name: 'ADMIN'
          },
          isActive: true
        }
      });

      // Compile permissions
      const roles = roleAssignments.map((ra: RoleAssignmentWithRole) => ra.role);
      const permissions = new Set<string>();
      
      roleAssignments.forEach((ra: RoleAssignmentWithRole) => {
        ra.role.permissions.forEach((rp: any) => {
          permissions.add(rp.permission.name);
        });
      });

      const userPermissions: UserPermissions = {
        userId,
        packageId,
        roles,
        permissions: Array.from(permissions),
        resourceAccess,
        isPackageAdmin: roles.some((role: any) => role.name === 'ADMIN' && role.packageId === packageId),
        isSystemAdmin: !!systemAdminRole
      };

      await this.cache.set(cacheKey, userPermissions, this.cacheTTL);
      return userPermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  /**
   * Check specific meeting permissions
   */
  async checkMeetingPermissions(userId: string, meetingId: string): Promise<MeetingPermissions> {
    const packageId = 'meetings'; // meetings package ID
    
    try {
      // Check if user is owner of the meeting
      const ownerAccess = await this.prisma.resourceAccess.findFirst({
        where: {
          userId,
          packageId,
          resourceType: 'meeting',
          resourceId: meetingId,
          accessType: 'OWNER',
          isActive: true
        }
      });

      // Get all resource access for this meeting
      const resourceAccess = await this.prisma.resourceAccess.findMany({
        where: {
          userId,
          packageId,
          resourceType: 'meeting',
          resourceId: meetingId,
          isActive: true
        }
      });

      // Get user's general permissions for meetings package
      const userPermissions = await this.getUserPermissions(userId, packageId);

      const isOwner = !!ownerAccess;
      const hasEditorAccess = resourceAccess.some((ra: ResourceAccessRecord) => ra.accessType === 'EDITOR');
      const hasViewerAccess = resourceAccess.some((ra: ResourceAccessRecord) => ra.accessType === 'VIEWER');
      const hasLimitedEditorAccess = resourceAccess.some((ra: ResourceAccessRecord) => ra.accessType === 'LIMITED_EDITOR');
      
      const hasGeneralMeetingPermissions = userPermissions.permissions.includes('meeting:write') || 
                                         userPermissions.isPackageAdmin || 
                                         userPermissions.isSystemAdmin;

      return {
        canView: isOwner || hasEditorAccess || hasViewerAccess || hasLimitedEditorAccess || hasGeneralMeetingPermissions,
        canEdit: isOwner || hasEditorAccess || hasGeneralMeetingPermissions,
        canDelete: isOwner || userPermissions.isPackageAdmin || userPermissions.isSystemAdmin,
        canManageParticipants: isOwner || hasEditorAccess || hasGeneralMeetingPermissions,
        canBook: isOwner || hasEditorAccess || hasLimitedEditorAccess || hasGeneralMeetingPermissions,
        canComment: isOwner || hasEditorAccess || hasViewerAccess || hasLimitedEditorAccess,
        accessType: resourceAccess[0]?.accessType as AccessType || null
      };
    } catch (error) {
      console.error('Error checking meeting permissions:', error);
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageParticipants: false,
        canBook: false,
        canComment: false,
        accessType: null
      };
    }
  }

  // ============================================================================
  // ROLE AND ACCESS MANAGEMENT
  // ============================================================================

  /**
   * Grant a role to a user
   */
  async grantRole(request: GrantRoleRequest, grantedBy: string): Promise<void> {
    try {
      // Find the role
      const role = await this.prisma.role.findFirst({
        where: {
          name: request.roleName,
          packageId: request.packageId,
          isActive: true
        }
      });

      if (!role) {
        throw new Error(`Role ${request.roleName} not found`);
      }

      // Create role assignment
      await this.prisma.roleAssignment.create({
        data: {
          userId: request.userId,
          roleId: role.id,
          packageId: request.packageId,
          resourceType: request.resourceType,
          resourceId: request.resourceId,
          grantedBy,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
          metadata: request.metadata
        }
      });

      // Clear user's permission cache
      await this.clearUserPermissionCache(request.userId, request.packageId);

      // Audit log
      if (this.enableAuditLogging) {
        await this.logAuditEvent({
          userId: grantedBy,
          targetUserId: request.userId,
          packageId: request.packageId,
          action: AuditAction.ROLE_ASSIGNED,
          resourceType: request.resourceType,
          resourceId: request.resourceId,
          details: {
            roleName: request.roleName,
            metadata: request.metadata
          }
        });
      }
    } catch (error) {
      console.error('Error granting role:', error);
      throw error;
    }
  }

  /**
   * Grant direct resource access to a user
   */
  async grantResourceAccess(request: GrantAccessRequest, grantedBy: string): Promise<void> {
    try {
      // Create or update resource access
      await this.prisma.resourceAccess.upsert({
        where: {
          userId_packageId_resourceType_resourceId_accessType: {
            userId: request.userId,
            packageId: request.packageId,
            resourceType: request.resourceType,
            resourceId: request.resourceId,
            accessType: request.accessType
          }
        },
        update: {
          grantedBy,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
          metadata: request.metadata,
          isActive: true
        },
        create: {
          userId: request.userId,
          packageId: request.packageId,
          resourceType: request.resourceType,
          resourceId: request.resourceId,
          accessType: request.accessType,
          grantedBy,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
          metadata: request.metadata
        }
      });

      // Clear user's permission cache
      await this.clearUserPermissionCache(request.userId, request.packageId);

      // Audit log
      if (this.enableAuditLogging) {
        await this.logAuditEvent({
          userId: grantedBy,
          targetUserId: request.userId,
          packageId: request.packageId,
          action: AuditAction.RESOURCE_ACCESS_GRANTED,
          resourceType: request.resourceType,
          resourceId: request.resourceId,
          details: {
            accessType: request.accessType,
            metadata: request.metadata
          }
        });
      }
    } catch (error) {
      console.error('Error granting resource access:', error);
      throw error;
    }
  }

  /**
   * Request access to a package
   */
  async requestPackageAccess(userId: string, request: PackageAccessRequest): Promise<{ approved: boolean; reason?: string }> {
    try {
      // Get package info
      const pkg = await this.prisma.package.findUnique({
        where: { id: request.packageId }
      });

      if (!pkg || !pkg.isActive) {
        throw new Error('Package not found or inactive');
      }

      switch (pkg.registrationType) {
        case RegistrationType.SELF_REGISTER:
          // Automatically grant basic access
          await this.grantRole({
            userId,
            roleName: 'USER',
            packageId: request.packageId,
            metadata: request.metadata
          }, 'system');
          
          return { approved: true, reason: 'Auto-approved for self-registration package' };

        case RegistrationType.APPROVAL_REQUIRED:
          // Create pending request (would need a separate model for this)
          // For now, just log it
          await this.logAuditEvent({
            userId,
            packageId: request.packageId,
            action: AuditAction.USER_APPROVED, // Would be USER_REQUESTED in a full implementation
            details: {
              reason: request.reason,
              metadata: request.metadata,
              status: 'pending'
            }
          });
          
          return { approved: false, reason: 'Approval required - request submitted for review' };

        case RegistrationType.ADMIN_ONLY:
          return { approved: false, reason: 'Admin-only package - contact administrator' };

        default:
          return { approved: false, reason: 'Unknown registration type' };
      }
    } catch (error) {
      console.error('Error requesting package access:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Evaluate permission without caching
   */
  private async evaluatePermission(context: AuthorizationContext): Promise<AuthorizationResult> {
    const userPermissions = await this.getUserPermissions(context.userId, context.packageId);
    
    // System admin has all permissions
    if (userPermissions.isSystemAdmin) {
      return {
        allowed: true,
        permissions: [{ permission: 'system:admin', allowed: true }],
        roles: ['SYSTEM_ADMIN'],
        reason: 'System administrator'
      };
    }

    // Package admin has all package permissions
    if (userPermissions.isPackageAdmin) {
      return {
        allowed: true,
        permissions: [{ permission: 'package:admin', allowed: true }],
        roles: userPermissions.roles.map(r => r.name),
        reason: 'Package administrator'
      };
    }

    // Check specific permissions and resource access
    const permissionChecks: PermissionCheck[] = [];
    let allowed = false;

    // Check role-based permissions
    if (context.action) {
      const hasPermission = userPermissions.permissions.includes(context.action);
      permissionChecks.push({
        permission: context.action,
        allowed: hasPermission,
        reason: hasPermission ? 'Role-based permission' : 'Missing role-based permission'
      });
      
      if (hasPermission) allowed = true;
    }

    // Check resource-specific access
    if (context.resourceType && context.resourceId) {
      const resourceAccess = userPermissions.resourceAccess.find(ra => 
        ra.resourceType === context.resourceType && 
        ra.resourceId === context.resourceId
      );
      
      if (resourceAccess) {
        permissionChecks.push({
          permission: `${context.resourceType}:${resourceAccess.accessType.toLowerCase()}`,
          allowed: true,
          reason: 'Direct resource access'
        });
        allowed = true;
      }
    }

    return {
      allowed,
      permissions: permissionChecks,
      roles: userPermissions.roles.map(r => r.name),
      reason: allowed ? 'Permission granted' : 'No matching permissions found'
    };
  }

  /**
   * Build cache key for permission check
   */
  private buildPermissionCacheKey(context: AuthorizationContext): string {
    const parts = [
      'permission',
      context.userId,
      context.packageId,
      context.resourceType || 'null',
      context.resourceId || 'null',
      context.action || 'null'
    ];
    return parts.join(':');
  }

  /**
   * Clear user's permission cache
   */
  private async clearUserPermissionCache(userId: string, packageId?: string): Promise<void> {
    const pattern = packageId ? `*${userId}*${packageId}*` : `*${userId}*`;
    // In a real implementation, you'd want pattern-based cache clearing
    // For now, we'll just clear the entire cache
    await this.cache.clear();
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    userId?: string;
    targetUserId?: string;
    packageId?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    details?: any;
  }): Promise<void> {
    if (!this.enableAuditLogging || !this.prisma) return;

    try {
      await this.prisma.authAuditLog.create({
        data: {
          userId: event.userId,
          targetUserId: event.targetUserId,
          packageId: event.packageId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          details: event.details
        }
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw - audit logging failures shouldn't break the main flow
    }
  }
}

// Default authorization engine instance
let defaultEngine: AuthorizationEngine | null = null;

/**
 * Get or create the default authorization engine
 */
export function getAuthorizationEngine(config?: AuthorizationConfig): AuthorizationEngine {
  if (!defaultEngine) {
    defaultEngine = new AuthorizationEngine(config);
  }
  return defaultEngine;
}

/**
 * Convenience function to check permissions
 */
export async function checkPermission(context: AuthorizationContext): Promise<AuthorizationResult> {
  const engine = getAuthorizationEngine();
  return engine.checkPermission(context);
}

/**
 * Convenience function to get user permissions
 */
export async function getUserPermissions(userId: string, packageId: string): Promise<UserPermissions> {
  const engine = getAuthorizationEngine();
  return engine.getUserPermissions(userId, packageId);
}

/**
 * Convenience function to check meeting permissions
 */
export async function checkMeetingPermissions(userId: string, meetingId: string): Promise<MeetingPermissions> {
  const engine = getAuthorizationEngine();
  return engine.checkMeetingPermissions(userId, meetingId);
} 
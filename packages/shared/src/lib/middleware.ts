// Authorization middleware for API route protection
import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationEngine } from './authorization';
import type { AuthorizationContext, AuthorizationResult } from '../types';

// Middleware configuration
export interface AuthMiddlewareConfig {
  packageId: string;
  requiredPermissions?: string[];
  resourceType?: string;
  allowSystemAdmin?: boolean;
  allowPackageAdmin?: boolean;
}

// Request context with authorization info
export interface AuthorizedRequest extends NextRequest {
  auth?: {
    userId: string;
    permissions: AuthorizationResult;
    isSystemAdmin: boolean;
    isPackageAdmin: boolean;
  };
}

/**
 * Higher-order function to create authorization middleware
 */
export function withAuthorization(config: AuthMiddlewareConfig) {
  return function authMiddleware(
    handler: (req: AuthorizedRequest, context?: any) => Promise<NextResponse> | NextResponse
  ) {
    return async function(req: NextRequest, context?: any): Promise<NextResponse> {
      try {
        // Extract user ID from session (this would need to be adapted to your auth system)
        const userId = await getUserIdFromSession(req);
        
        if (!userId) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        // Extract resource ID from URL if needed
        const resourceId = extractResourceId(req, config.resourceType);

        // Build authorization context
        const authContext: AuthorizationContext = {
          userId,
          packageId: config.packageId,
          resourceType: config.resourceType,
          resourceId: resourceId || undefined
        };

        // Check permissions
        const authEngine = getAuthorizationEngine();
        const userPermissions = await authEngine.getUserPermissions(userId, config.packageId);
        
        // Allow system admin if configured
        if (config.allowSystemAdmin && userPermissions.isSystemAdmin) {
          const authorizedReq = req as AuthorizedRequest;
          authorizedReq.auth = {
            userId,
            permissions: {
              allowed: true,
              permissions: [{ permission: 'system:admin', allowed: true }],
              roles: ['SYSTEM_ADMIN'],
              reason: 'System administrator'
            },
            isSystemAdmin: true,
            isPackageAdmin: userPermissions.isPackageAdmin
          };
          return handler(authorizedReq, context);
        }

        // Allow package admin if configured
        if (config.allowPackageAdmin && userPermissions.isPackageAdmin) {
          const authorizedReq = req as AuthorizedRequest;
          authorizedReq.auth = {
            userId,
            permissions: {
              allowed: true,
              permissions: [{ permission: 'package:admin', allowed: true }],
              roles: userPermissions.roles.map(r => r.name),
              reason: 'Package administrator'
            },
            isSystemAdmin: userPermissions.isSystemAdmin,
            isPackageAdmin: true
          };
          return handler(authorizedReq, context);
        }

        // Check specific permissions if required
        if (config.requiredPermissions && config.requiredPermissions.length > 0) {
          const missingPermissions = config.requiredPermissions.filter(
            permission => !userPermissions.permissions.includes(permission)
          );

          if (missingPermissions.length > 0) {
            return NextResponse.json(
              { 
                error: 'Insufficient permissions',
                missing: missingPermissions,
                required: config.requiredPermissions
              },
              { status: 403 }
            );
          }
        }

        // Check general authorization
        const authResult = await authEngine.checkPermission(authContext);
        
        if (!authResult.allowed) {
          return NextResponse.json(
            { 
              error: 'Access denied',
              reason: authResult.reason,
              required: config.requiredPermissions || []
            },
            { status: 403 }
          );
        }

        // Add auth info to request
        const authorizedReq = req as AuthorizedRequest;
        authorizedReq.auth = {
          userId,
          permissions: authResult,
          isSystemAdmin: userPermissions.isSystemAdmin,
          isPackageAdmin: userPermissions.isPackageAdmin
        };

        return handler(authorizedReq, context);
      } catch (error) {
        console.error('Authorization middleware error:', error);
        return NextResponse.json(
          { error: 'Authorization check failed' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Middleware specifically for meeting resource authorization
 */
export function withMeetingAuthorization(requiredAccess: 'view' | 'edit' | 'delete' | 'manage') {
  return function meetingAuthMiddleware(
    handler: (req: AuthorizedRequest, context?: any) => Promise<NextResponse> | NextResponse
  ) {
    return async function(req: NextRequest, context?: any): Promise<NextResponse> {
      try {
        const userId = await getUserIdFromSession(req);
        
        if (!userId) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        // Extract meeting ID from URL
        const meetingId = extractResourceId(req, 'meeting');
        
        if (!meetingId) {
          return NextResponse.json(
            { error: 'Meeting ID required' },
            { status: 400 }
          );
        }

        // Check meeting-specific permissions
        const authEngine = getAuthorizationEngine();
        const meetingPermissions = await authEngine.checkMeetingPermissions(userId, meetingId);

        // Check required access level
        let hasAccess = false;
        switch (requiredAccess) {
          case 'view':
            hasAccess = meetingPermissions.canView;
            break;
          case 'edit':
            hasAccess = meetingPermissions.canEdit;
            break;
          case 'delete':
            hasAccess = meetingPermissions.canDelete;
            break;
          case 'manage':
            hasAccess = meetingPermissions.canManageParticipants;
            break;
        }

        if (!hasAccess) {
          return NextResponse.json(
            { 
              error: `Insufficient permissions to ${requiredAccess} meeting`,
              meetingId,
              userAccess: meetingPermissions.accessType
            },
            { status: 403 }
          );
        }

        // Add auth info to request
        const authorizedReq = req as AuthorizedRequest;
        authorizedReq.auth = {
          userId,
          permissions: {
            allowed: true,
            permissions: [{ permission: `meeting:${requiredAccess}`, allowed: true }],
            roles: [],
            reason: `Meeting ${requiredAccess} access granted`
          },
          isSystemAdmin: false, // Will be properly set if needed
          isPackageAdmin: false
        };

        // Also add meeting permissions to the request
        (authorizedReq as any).meetingAuth = {
          meetingId,
          permissions: meetingPermissions
        };

        return handler(authorizedReq, context);
      } catch (error) {
        console.error('Meeting authorization middleware error:', error);
        return NextResponse.json(
          { error: 'Meeting authorization check failed' },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Extract user ID from session - this needs to be adapted to your auth system
 */
async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  try {
    // This is a placeholder - you'll need to integrate with your Next-Auth setup
    // Example approaches:
    
    // Option 1: Using next-auth/jwt
    // const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    // return token?.sub || null;
    
    // Option 2: Using cookies/session
    // const sessionToken = req.cookies.get('next-auth.session-token')?.value;
    // if (sessionToken) {
    //   const session = await getSessionFromToken(sessionToken);
    //   return session?.user?.id || null;
    // }
    
    // Option 3: Using Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Decode JWT or validate API token
      // const token = authHeader.substring(7);
      // return validateTokenAndGetUserId(token);
    }
    
    // For now, return null - this needs real implementation
    console.warn('getUserIdFromSession not implemented - returning null');
    return null;
  } catch (error) {
    console.error('Error extracting user ID from session:', error);
    return null;
  }
}

/**
 * Extract resource ID from URL parameters
 */
function extractResourceId(req: NextRequest, resourceType?: string): string | null {
  if (!resourceType) return null;
  
  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Common patterns for resource IDs in URLs
    // e.g., /api/meetings/[meetingId], /api/presentations/[presentationId]
    
    // Look for the resource type in the path and get the next segment
    const resourceIndex = pathSegments.findIndex(segment => 
      segment === resourceType || segment === `${resourceType}s`
    );
    
    if (resourceIndex >= 0 && resourceIndex < pathSegments.length - 1) {
      return pathSegments[resourceIndex + 1];
    }
    
    // Alternative: look for common ID patterns
    const possibleId = pathSegments.find(segment => 
      segment.match(/^[a-zA-Z0-9_-]{10,}$/) // CUID-like pattern
    );
    
    return possibleId || null;
  } catch (error) {
    console.error('Error extracting resource ID:', error);
    return null;
  }
}

/**
 * Utility function to check if user has specific permission
 */
export async function hasPermission(
  userId: string, 
  packageId: string, 
  permission: string
): Promise<boolean> {
  try {
    const authEngine = getAuthorizationEngine();
    const result = await authEngine.checkPermission({
      userId,
      packageId,
      action: permission
    });
    return result.allowed;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Utility function to get user's effective permissions for a package
 */
export async function getEffectivePermissions(
  userId: string, 
  packageId: string
): Promise<string[]> {
  try {
    const authEngine = getAuthorizationEngine();
    const userPermissions = await authEngine.getUserPermissions(userId, packageId);
    return userPermissions.permissions;
  } catch (error) {
    console.error('Error getting effective permissions:', error);
    return [];
  }
} 
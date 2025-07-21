import { auth } from '@/src/auth';
import { getUserProfileByUserId, getOrganizationsByContactId, getRoleByContactId, getPlatformRole } from '@/src/lib/database';
import { NextResponse } from 'next/server';
import { UserProfile } from '@/src/types/user';
import { headers } from 'next/headers';

export interface ValidationResult {
  success: boolean;
  user?: {
    id: string;
    contactId: string;
    contact: UserProfile;
    organizations: Array<{
      id: string;
      name: string;
      logoUrl?: string | null;
      role?: string;
    }>;
    activeOrganizationId: string | null;
    role: string | null;
    platformRole: string | null;
  };
  response?: NextResponse;
}

export async function validateApiAccess(requiredRole?: string, requirePlatformRole?: string): Promise<ValidationResult> {
  // Check if LOCAL_API is enabled for localhost bypass
  if (process.env.LOCAL_API === 'true') {
    const headersList = await headers();
    const host = headersList.get('host');
    
    if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
      console.log('[AUTH BYPASS] Skipping API validation for localhost request');
      
      // Return a mock successful validation for localhost
      return {
        success: true,
        user: {
          id: 'localhost-user',
          contactId: 'localhost-contact',
          contact: {
            id: 'localhost-contact',
            email: 'localhost@example.com',
            firstName: 'Local',
            lastName: 'User',
            role: 'admin',
            organizationId: 'localhost-org'
          } as UserProfile,
          organizations: [{
            id: 'localhost-org',
            name: 'Local Development Org',
            logoUrl: null,
            role: 'admin'
          }],
          activeOrganizationId: 'localhost-org',
          role: 'admin',
          platformRole: 'admin'
        }
      };
    }
  }

  const session = await auth();
  
  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  try {
    // Always validate against database, never trust session
    const userProfile = await getUserProfileByUserId(session.user.id);
    
    if (!userProfile) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'User not found',
          shouldRefreshSession: true 
        }, { status: 404 })
      };
    }

    const organizations = await getOrganizationsByContactId(userProfile.id);
    const sessionActiveOrg = session.user.activeOrganizationId;
    
    // Check if user still has access to their active organization
    const hasAccessToActiveOrg = sessionActiveOrg && organizations?.some(org => org.id === sessionActiveOrg);
    
    let activeOrganizationId: string | null;
    let role: string | null = null;

    if (hasAccessToActiveOrg) {
      activeOrganizationId = sessionActiveOrg;
      role = await getRoleByContactId(userProfile.id, sessionActiveOrg);
    } else {
      // User lost access to active org - switch to first available
      activeOrganizationId = organizations?.[0]?.id || null;
      if (activeOrganizationId) {
        role = await getRoleByContactId(userProfile.id, activeOrganizationId);
      }
    }

    // If user has no organizations, they should be logged out
    if (!activeOrganizationId || !organizations?.length) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'No organization access',
          shouldLogout: true 
        }, { status: 403 })
      };
    }

    // Check platform permissions
    const platformRole = await getPlatformRole(session.user.id);

    // Validate required organization role
    if (requiredRole && role !== requiredRole && !['owner', 'admin'].includes(role || '')) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Insufficient organization permissions',
          required: requiredRole,
          current: role,
          shouldRefreshSession: true
        }, { status: 403 })
      };
    }

    // Validate required platform role
    if (requirePlatformRole && platformRole !== requirePlatformRole) {
      return {
        success: false,
        response: NextResponse.json({ 
          error: 'Insufficient platform permissions',
          required: requirePlatformRole,
          current: platformRole
        }, { status: 403 })
      };
    }

    // Check if session data is stale (org changed)
    if (!hasAccessToActiveOrg) {
      return {
        success: true,
        user: {
          id: session.user.id,
          contactId: userProfile.id,
          contact: userProfile,
          organizations: organizations || [],
          activeOrganizationId,
          role,
          platformRole
        },
        response: NextResponse.json({ 
          message: 'Session updated due to organization access change',
          shouldRefreshSession: true,
          newActiveOrganizationId: activeOrganizationId
        }, { status: 200 })
      };
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        contactId: userProfile.id,
        contact: userProfile,
        organizations: organizations || [],
        activeOrganizationId,
        role,
        platformRole
      }
    };

  } catch (error) {
    console.error('Error validating API access:', error);
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Internal server error during validation' 
      }, { status: 500 })
    };
  }
}

// Helper for organization-specific operations
export async function validateOrganizationAccess(organizationId: string, requiredRole?: string): Promise<ValidationResult> {
  const validation = await validateApiAccess();
  
  if (!validation.success) {
    return validation;
  }

  const user = validation.user!;
  
  // Check if user has access to the specific organization
  const hasOrgAccess = user.organizations.some(org => org.id === organizationId);
  
  if (!hasOrgAccess) {
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Access denied to organization',
        organizationId 
      }, { status: 403 })
    };
  }

  // Get role for the specific organization
  const orgRole = await getRoleByContactId(user.contactId, organizationId);
  
  if (requiredRole && orgRole !== requiredRole && !['owner', 'admin'].includes(orgRole || '')) {
    return {
      success: false,
      response: NextResponse.json({ 
        error: 'Insufficient permissions for organization',
        required: requiredRole,
        current: orgRole,
        organizationId 
      }, { status: 403 })
    };
  }

  return {
    success: true,
    user: {
      ...user,
      role: orgRole
    }
  };
} 
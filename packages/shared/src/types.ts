// Placeholder for shared types
export type SharedType = string; // Example export

// ============================================================================
// AUTHORIZATION TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

// Package registration types
export enum RegistrationType {
  SELF_REGISTER = "SELF_REGISTER",
  APPROVAL_REQUIRED = "APPROVAL_REQUIRED", 
  ADMIN_ONLY = "ADMIN_ONLY"
}

export enum AccessType {
  OWNER = "OWNER",
  EDITOR = "EDITOR", 
  VIEWER = "VIEWER",
  LIMITED_EDITOR = "LIMITED_EDITOR",
  COLLABORATOR = "COLLABORATOR",
  CUSTOM = "CUSTOM"
}

export enum AuditAction {
  ROLE_ASSIGNED = "ROLE_ASSIGNED",
  ROLE_REVOKED = "ROLE_REVOKED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
  PERMISSION_REVOKED = "PERMISSION_REVOKED",
  RESOURCE_ACCESS_GRANTED = "RESOURCE_ACCESS_GRANTED",
  RESOURCE_ACCESS_REVOKED = "RESOURCE_ACCESS_REVOKED",
  PACKAGE_REGISTERED = "PACKAGE_REGISTERED",
  PACKAGE_DEACTIVATED = "PACKAGE_DEACTIVATED",
  USER_APPROVED = "USER_APPROVED",
  USER_DENIED = "USER_DENIED"
}

// Core authorization interfaces
export interface Package {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  registrationType: RegistrationType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  packageId?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  packageId: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  packageId?: string;
  resourceType?: string;
  resourceId?: string;
  grantedBy?: string;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceAccess {
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

// Authorization context and results
export interface AuthorizationContext {
  userId: string;
  packageId: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
}

export interface PermissionCheck {
  permission: string;
  allowed: boolean;
  reason?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  permissions: PermissionCheck[];
  roles: string[];
  reason?: string;
}

// User permissions summary
export interface UserPermissions {
  userId: string;
  packageId: string;
  roles: Role[];
  permissions: string[];
  resourceAccess: ResourceAccess[];
  isPackageAdmin: boolean;
  isSystemAdmin: boolean;
}

// API request/response types
export interface GrantRoleRequest {
  userId: string;
  roleName: string;
  packageId?: string;
  resourceType?: string;
  resourceId?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface GrantAccessRequest {
  userId: string;
  packageId: string;
  resourceType: string;
  resourceId: string;
  accessType: AccessType;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface PackageAccessRequest {
  packageId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

// Meeting-specific authorization types
export interface MeetingPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageParticipants: boolean;
  canBook: boolean;
  canComment: boolean;
  accessType: AccessType | null;
}

export interface MeetingAuthContext {
  meetingId: string;
  userId: string;
  isOwner: boolean;
  permissions: MeetingPermissions;
}


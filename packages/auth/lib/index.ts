// Database utilities
import { PrismaClient } from '@prisma/client';

// Shared Prisma client instance
export const createPrismaClient = () => {
  return new PrismaClient();
};

// Admin utilities
export const isAdmin = (email: string): boolean => {
  const adminUsers = process.env.ADMIN_USERS?.split(',').map(email => email.trim()) || [];
  return adminUsers.includes(email);
};

// Check if user has package access
export const hasPackageAccess = async (userId: string, packageName: string): Promise<boolean> => {
  // TODO: Implement package access check using authorization system
  // This would query the RoleAssignment and ResourceAccess tables
  return true; // Placeholder
};

// API utilities for other packages to use
export const createAdminApiHandler = (handler: Function) => {
  return async (req: any) => {
    // Common admin authentication logic
    // Return 401/403 if not admin
    // Otherwise call the handler
    return handler(req);
  };
};

// Middleware utilities
export const createAuthMiddleware = (options?: any) => {
  // Return middleware function that other packages can use
  return (req: any) => {
    // Common authentication middleware logic
  };
}; 
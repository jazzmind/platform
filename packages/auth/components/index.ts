// Export all reusable components
export { default as ProviderButton } from '../src/components/ProviderButton';
export { default as Providers } from '../src/components/Providers';

// Admin components
export { default as AdminDashboard } from '../src/components/admin/AdminDashboard';
export { default as SystemStatus } from '../src/components/admin/SystemStatus';
export { default as PackagesManager } from '../src/components/admin/PackagesManager';
export { default as UsersManager } from '../src/components/admin/UsersManager';
export { default as RolesManager } from '../src/components/admin/RolesManager';

// Export component types directly
export interface Package {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  registrationType: string;
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

export interface User {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

// Component prop types
export interface AdminDashboardProps {
  userEmail: string;
}

export interface SystemStatusProps {
  packages: Package[];
  users: User[];
  roles: Role[];
}

export interface PackagesManagerProps {
  packages: Package[];
  onPackagesChange: () => void;
}

export interface UsersManagerProps {
  users: User[];
  packages: Package[];
  onUsersChange: () => void;
}

export interface RolesManagerProps {
  roles: Role[];
  packages: Package[];
  onRolesChange: () => void;
}

// Re-export commonly used types
export type { ReactNode } from 'react'; 
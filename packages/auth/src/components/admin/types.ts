// Shared types for admin components
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
  emailVerified?: boolean;
  image?: string;
  role?: string | null;
  banned?: boolean | null;
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
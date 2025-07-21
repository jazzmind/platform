// Export the main NextAuth configuration and utilities
export { auth, signIn, signOut, handlers } from './src/auth';
export { authConfig } from './src/auth.config';

// Export reusable components
export { default as ProviderButton } from './src/components/ProviderButton';
export { default as Providers } from './src/components/Providers';

// Export admin components for embedding in other apps
export { default as AdminDashboard } from './src/components/admin/AdminDashboard';
export { default as SystemStatus } from './src/components/admin/SystemStatus';
export { default as PackagesManager } from './src/components/admin/PackagesManager';
export { default as UsersManager } from './src/components/admin/UsersManager';
export { default as RolesManager } from './src/components/admin/RolesManager';

// Export utility functions and types
export type { 
  Session, 
  User
} from 'next-auth';

// Re-export commonly used NextAuth functions
export { 
  SessionProvider, 
  useSession, 
  getSession 
} from 'next-auth/react';

// Export CSS for styling
export const authStyles = './src/app/globals.css'; 
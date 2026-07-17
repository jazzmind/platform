/**
 * Server-only exports. Import from `@jazzmind/auth` in API routes, server
 * components, middleware that runs on the Node runtime, and scripts.
 *
 * For browser / client-component usage import from `@jazzmind/auth/client`.
 */

export { auth } from './src/auth';
export type { Auth, Session } from './src/auth';
export { requireAdmin, requireSession } from './src/guards';
export type { AdminGuardResult } from './src/guards';

// Reusable React components (server-safe; internally "use client" where needed).
export { default as ProviderButton } from './src/components/ProviderButton';
export { default as Providers } from './src/components/Providers';
export { default as AdminDashboard } from './src/components/admin/AdminDashboard';
export { default as SystemStatus } from './src/components/admin/SystemStatus';
export { default as PackagesManager } from './src/components/admin/PackagesManager';
export { default as UsersManager } from './src/components/admin/UsersManager';
export { default as RolesManager } from './src/components/admin/RolesManager';

export const authStyles = './src/app/globals.css';

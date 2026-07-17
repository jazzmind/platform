import { NextResponse, type NextRequest } from 'next/server';
import { auth, type Session } from './auth';

export interface AdminGuardResult {
  session: Session;
  email: string;
}

/**
 * Resolve the current session and confirm the user is an administrator.
 *
 * Admin status is granted if ANY of the following is true:
 *   1. `session.user.role === 'admin'` (set via the better-auth admin plugin)
 *   2. The user's email appears in the `ADMIN_USERS` env var (comma-separated).
 *      Kept for backward compatibility during the Auth.js → better-auth
 *      migration; can be removed once every admin has a DB `role`.
 *
 * Returns a NextResponse on failure so callers can `return` it directly.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<AdminGuardResult | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const email = session.user.email;
  const dbAdmin = (session.user as { role?: string | null }).role === 'admin';
  const envAdmins = (process.env.ADMIN_USERS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const envAdmin = envAdmins.includes(email.toLowerCase());

  if (!dbAdmin && !envAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return { session, email };
}

/**
 * Resolve the current session (no admin requirement).
 */
export async function requireSession(
  req: NextRequest,
): Promise<Session | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return session;
}

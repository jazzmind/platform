import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Node.js-runtime proxy that enforces an authenticated session cookie.
 *
 * This is an optimistic check only: `getSessionCookie` merely confirms that
 * a session cookie is present; the cookie's signature/validity is enforced
 * by the server on every protected request. Always re-validate the session
 * with `auth.api.getSession` inside the protected page / route handler.
 */
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL('/signin', request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|signin).*)'],
};

import NextAuth from "next-auth";
import { authConfig } from "./auth.config"; // Assuming auth.config.ts is in the root of packages/auth

// Use `NextAuth(authConfig).auth` to get the middleware function
// The `pages` configuration in `authConfig` will be used for redirects.
export const middleware = NextAuth(authConfig).auth;

export const config = {
  // Matcher protecting routes that require authentication
  // Adjust as necessary, e.g., to protect an /admin area or all routes except public ones.
  // This example protects /profile and any sub-routes.
  // It excludes API routes, Next.js static files, images, and favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
}; 
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
// NodemailerProvider and PrismaAdapter are typically NOT fully Edge-compatible,
// so they will be in the main [...nextauth].ts (now auth.ts)


export const authConfig = {
  providers: [
    // Email/Nodemailer will be added in the main auth.ts due to potential Node.js dependencies for email sending.
    // Passkey provider stubs will also go into main auth.ts
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Apple({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET,
      issuer: process.env.MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // In JWT strategy, auth will contain the token if the user is authenticated
      const isLoggedIn = !!auth?.user;
      
      const isOnProtectedPath = nextUrl.pathname.startsWith("/profile"); 

      if (isOnProtectedPath) {
        if (isLoggedIn) {
          return true;
        }
        return false; 
      }
      return true;
    },
    // JWT and Session callbacks are often in the main auth.ts if they involve DB lookups (Prisma)
    // For Edge, jwt callback can be simple if session strategy is 'jwt' and no DB is hit.
    // If session strategy is 'database', session callback might also need to be in main auth.ts.
    // Your current [...nextauth].ts uses 'database' strategy.
  },
  pages: {
    signIn: '/signin',
    error: '/auth/error',
    signOut: '/',
  },
  trustHost: true, // Recommended for local development and proxies
  theme: {
    logo: "https://next-auth.js.org/img/logo/logo-sm.png",
  },
} satisfies NextAuthConfig; 
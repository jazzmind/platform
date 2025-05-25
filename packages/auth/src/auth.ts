import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import NodemailerProvider from "next-auth/providers/nodemailer";
import PasskeyProvider from "next-auth/providers/passkey";

// Import the Edge-compatible base configuration
import { authConfig } from "@/auth.config";

// Detect if we're in an Edge runtime environment
const isEdgeRuntime = typeof process.env.NEXT_RUNTIME === 'string' && 
  process.env.NEXT_RUNTIME === 'edge';

const prisma = new PrismaClient();

console.log(
  "[AUTH.TS] AUTH_SECRET:",
  process.env.AUTH_SECRET ? "Set" : "NOT SET",
  process.env.AUTH_SECRET
    ? process.env.AUTH_SECRET.substring(0, 5) + "..."
    : "N/A"
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Spread the base config
  ...authConfig,
  // Only use PrismaAdapter when not in Edge runtime
  adapter: isEdgeRuntime ? undefined : PrismaAdapter(prisma),
  providers: [
    // Include providers from authConfig
    ...authConfig.providers,
    // Add Node.js specific providers
    NodemailerProvider({
      server: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    PasskeyProvider,
  ],
  experimental: {
    enableWebAuthn: true, // Re-enabling WebAuthn
  },
  session: {
    strategy: "jwt", // Using JWT strategy
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    // Include the authorized callback from authConfig
    ...authConfig.callbacks,
    // Define session callback
    async session({ session, token }) {
      if (token.sub && session.user) {
        // Include user ID in session
        session.user.id = token.sub;
      }
      return session;
    },
    // Define JWT callback
    async jwt({ token, user }) {
      if (user) {
        // Include any user data we want in the token when the user first signs in
        token.id = user.id;
      }
      return token;
    }
  },
}); 
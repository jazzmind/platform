import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink, admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { passkey } from '@better-auth/passkey';
import { APIError, createAuthMiddleware } from 'better-auth/api';

import { prisma } from './db';
import { sendMagicLinkEmail } from './email';
import {
  parseAllowedDomains,
  isEmailAllowed,
  EMAIL_GATED_PATHS,
} from './email-domain';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[jazzmind/auth] Missing required env ${name}`);
  return v;
}

function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

const ALLOWED_EMAIL_DOMAINS = parseAllowedDomains(
  process.env.ALLOWED_EMAIL_DOMAINS,
);

const socialProviders: Record<string, Record<string, string>> = {};
if (optionalEnv('GOOGLE_CLIENT_ID') && optionalEnv('GOOGLE_CLIENT_SECRET')) {
  socialProviders.google = {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
  };
}
if (optionalEnv('APPLE_ID') && optionalEnv('APPLE_SECRET')) {
  socialProviders.apple = {
    clientId: requireEnv('APPLE_ID'),
    clientSecret: requireEnv('APPLE_SECRET'),
  };
}
if (
  optionalEnv('MICROSOFT_ENTRA_ID_CLIENT_ID') &&
  optionalEnv('MICROSOFT_ENTRA_ID_CLIENT_SECRET')
) {
  socialProviders.microsoft = {
    clientId: requireEnv('MICROSOFT_ENTRA_ID_CLIENT_ID'),
    clientSecret: requireEnv('MICROSOFT_ENTRA_ID_CLIENT_SECRET'),
    ...(optionalEnv('MICROSOFT_ENTRA_ID_TENANT')
      ? { tenantId: requireEnv('MICROSOFT_ENTRA_ID_TENANT') }
      : {}),
  };
}

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: 'jazzmind',
  secret: requireEnv('AUTH_SECRET'),
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL,
  trustedOrigins,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Passwords are disabled globally. Sign-in is magic-link, social, or passkey.
  emailAndPassword: { enabled: false },

  socialProviders,

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  },

  plugins: [
    magicLink({
      expiresIn: 300,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ to: email, url, expiresInSeconds: 300 });
      },
    }),
    passkey({
      rpID: optionalEnv('WEBAUTHN_RP_ID') ?? 'localhost',
      rpName: optionalEnv('WEBAUTHN_RP_NAME') ?? 'Jazzmind',
      origin: optionalEnv('BETTER_AUTH_URL'),
    }),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
    // nextCookies must be the last plugin so it can observe Set-Cookie
    // headers added by other plugins and propagate them through Next.js.
    nextCookies(),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ALLOWED_EMAIL_DOMAINS.length === 0) return;
      if (!EMAIL_GATED_PATHS.includes(ctx.path)) return;

      const email: string | undefined =
        ctx.body?.email ??
        ctx.body?.user?.email ??
        ctx.query?.email;

      if (!email) return; // other paths (social) hit a different code path
      if (isEmailAllowed(email, ALLOWED_EMAIL_DOMAINS)) return;

      throw new APIError('FORBIDDEN', {
        message: `Email domain not allowed. Allowed: ${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(', ')}`,
      });
    }),
  },

  /**
   * Extra user fields we want better-auth to persist automatically. `role` is
   * owned by the admin plugin so we don't duplicate it here.
   */
  user: {
    additionalFields: {
      // Currently no extras. Leave the block so future additions are trivial.
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;

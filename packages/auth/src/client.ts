import { createAuthClient } from 'better-auth/react';
import { adminClient, magicLinkClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

/**
 * Browser-side auth client.
 *
 * `NEXT_PUBLIC_BETTER_AUTH_URL` should be set to the app's own origin so the
 * client can hit `<origin>/api/auth/*`. When omitted, better-auth falls back
 * to the current window origin, which is fine for same-origin deployments.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [adminClient(), magicLinkClient(), passkeyClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;

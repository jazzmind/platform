'use client';

import type { ReactNode } from 'react';

/**
 * Legacy wrapper kept for backward compatibility. Better Auth's React client
 * does not require a context provider — `useSession` from
 * `@jazzmind/auth/client` subscribes directly to the auth store.
 *
 * Existing code can continue to render <Providers>…</Providers>; it now
 * simply passes children through.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Email domain allow-list gate.
 *
 * Pure helper with zero heavy imports — safe to use in unit tests without
 * bootstrapping the full better-auth instance.
 */

export function parseAllowedDomains(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((d) => d.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(
  email: string | undefined | null,
  domains: string[],
): boolean {
  if (!email) return false;
  if (domains.length === 0) return true;
  const lower = email.toLowerCase();
  return domains.some((d) => lower.endsWith(`@${d}`));
}

export const EMAIL_GATED_PATHS = [
  '/sign-in/magic-link',
  '/magic-link/verify',
  '/sign-in/email',
  '/sign-up/email',
  '/sign-in/social',
];

/**
 * Unit tests for the email-domain allow-list helper.
 *
 * Imports only the pure helper from `src/email-domain.ts` — never touches
 * `src/auth.ts`, so there's no passkey/webauthn/database import chain.
 */
import { describe, it, expect } from 'vitest';
import { parseAllowedDomains, isEmailAllowed } from '../../src/email-domain';

describe('isEmailAllowed', () => {
  it('allows any email when no domains are configured', () => {
    const domains = parseAllowedDomains(undefined);
    expect(isEmailAllowed('anyone@example.com', domains)).toBe(true);
  });

  it('allows matching domain (single)', () => {
    const domains = parseAllowedDomains('practera.com');
    expect(isEmailAllowed('user@practera.com', domains)).toBe(true);
    expect(isEmailAllowed('user@example.com', domains)).toBe(false);
  });

  it('allows any matching domain (multiple, whitespace tolerant)', () => {
    const domains = parseAllowedDomains(' practera.com , jazzmind.com ,');
    expect(isEmailAllowed('user@practera.com', domains)).toBe(true);
    expect(isEmailAllowed('user@jazzmind.com', domains)).toBe(true);
    expect(isEmailAllowed('user@other.com', domains)).toBe(false);
  });

  it('is case-insensitive on both sides', () => {
    const domains = parseAllowedDomains('Practera.COM');
    expect(isEmailAllowed('User@PRACTERA.com', domains)).toBe(true);
  });

  it('strips a leading @ from the env value', () => {
    const domains = parseAllowedDomains('@practera.com');
    expect(isEmailAllowed('user@practera.com', domains)).toBe(true);
  });

  it('rejects null / empty emails', () => {
    const domains = parseAllowedDomains('practera.com');
    expect(isEmailAllowed(null, domains)).toBe(false);
    expect(isEmailAllowed(undefined, domains)).toBe(false);
    expect(isEmailAllowed('', domains)).toBe(false);
  });
});

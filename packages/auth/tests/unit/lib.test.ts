/**
 * Unit tests for the `lib/` helpers that don't need a database connection.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isAdmin } from '../../lib';

describe('isAdmin', () => {
  beforeEach(() => {
    delete process.env.ADMIN_USERS;
  });

  it('returns false when email is null/undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin('')).toBe(false);
  });

  it('returns false when ADMIN_USERS is unset', () => {
    expect(isAdmin('anyone@practera.com')).toBe(false);
  });

  it('returns true for exact match', () => {
    process.env.ADMIN_USERS = 'admin@practera.com';
    expect(isAdmin('admin@practera.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    process.env.ADMIN_USERS = 'Admin@Practera.Com';
    expect(isAdmin('ADMIN@practera.com')).toBe(true);
    expect(isAdmin('admin@PRACTERA.COM')).toBe(true);
  });

  it('handles comma-separated list with whitespace', () => {
    process.env.ADMIN_USERS = ' admin@practera.com ,  owner@practera.com  ,';
    expect(isAdmin('owner@practera.com')).toBe(true);
    expect(isAdmin('other@practera.com')).toBe(false);
  });
});

/**
 * Unit tests for the admin / session guards.
 *
 * We stub `auth.api.getSession` by replacing the module before importing the
 * guard under test. No test double impersonates a real user — we just assert
 * the guard's response-shape contract against a range of session values.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

type SessionShape = { user?: { id?: string; email?: string; role?: string | null } } | null;

const getSessionMock = vi.fn<() => Promise<SessionShape>>();

vi.mock('@/auth', () => ({
  auth: { api: { getSession: (_args: unknown) => getSessionMock() } },
}));

async function makeReq(): Promise<import('next/server').NextRequest> {
  const { NextRequest } = await import('next/server');
  return new NextRequest(new URL('http://localhost/api/admin/test'));
}

describe('requireAdmin', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    delete process.env.ADMIN_USERS;
  });

  it('returns 401 when no session is present', async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireAdmin } = await import('../../src/guards');
    const res = await requireAdmin(await makeReq());
    expect('status' in res && res.status).toBe(401);
  });

  it('returns 401 when session has no email', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u' } });
    const { requireAdmin } = await import('../../src/guards');
    const res = await requireAdmin(await makeReq());
    expect('status' in res && res.status).toBe(401);
  });

  it('returns 403 when user is neither DB-admin nor in ADMIN_USERS', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u', email: 'nobody@practera.com', role: 'user' } });
    const { requireAdmin } = await import('../../src/guards');
    const res = await requireAdmin(await makeReq());
    expect('status' in res && res.status).toBe(403);
  });

  it('grants access when session.user.role === "admin"', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1', email: 'a@p.com', role: 'admin' } });
    const { requireAdmin } = await import('../../src/guards');
    const res = await requireAdmin(await makeReq());
    expect('session' in res).toBe(true);
    if ('email' in res) expect(res.email).toBe('a@p.com');
  });

  it('grants access when email is in ADMIN_USERS (case-insensitive)', async () => {
    process.env.ADMIN_USERS = 'Admin@Practera.com, other@practera.com';
    getSessionMock.mockResolvedValue({ user: { id: 'u2', email: 'admin@PRACTERA.com', role: null } });
    const { requireAdmin } = await import('../../src/guards');
    const res = await requireAdmin(await makeReq());
    expect('session' in res).toBe(true);
  });
});

describe('requireSession', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it('returns 401 when no user.id', async () => {
    getSessionMock.mockResolvedValue(null);
    const { requireSession } = await import('../../src/guards');
    const res = await requireSession(await makeReq());
    expect('status' in res && res.status).toBe(401);
  });

  it('returns the session when user.id is present', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'x', email: 'x@p.com' } });
    const { requireSession } = await import('../../src/guards');
    const res = await requireSession(await makeReq());
    expect('user' in res).toBe(true);
  });
});

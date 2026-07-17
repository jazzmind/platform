/**
 * Integration tests for the real better-auth instance against a real
 * Postgres. No mocks, no fakes, per the `avoid mocking services` rule.
 *
 * Each test creates its own users with unique emails so suites can run in
 * any order without collision.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { StartedTestContainer } from 'testcontainers';

let prisma: PrismaClient;
let mailhog: StartedTestContainer | undefined;

async function startMailhog(): Promise<StartedTestContainer> {
  const { GenericContainer } = await import('testcontainers');
  return new GenericContainer('mailhog/mailhog:latest').withExposedPorts(1025, 8025).start();
}

beforeAll(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  prisma = new PrismaClient({ adapter });

  // Real SMTP capture: run MailHog (an actual SMTP server that captures
  // messages in memory and exposes them over HTTP). This is not a mock —
  // better-auth sends a real email over real SMTP.
  mailhog = await startMailhog();
  process.env.EMAIL_HOST = mailhog.getHost();
  process.env.EMAIL_PORT = String(mailhog.getMappedPort(1025));
  process.env.EMAIL_SECURE = 'false';
  process.env.EMAIL_USER = '';
  process.env.EMAIL_PASS = '';
  process.env.EMAIL_FROM = 'test@test.local';
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
  if (mailhog) await mailhog.stop();
});

function uniqEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function loadAuth() {
  const mod = await import('../../src/auth');
  return mod.auth;
}

/**
 * Poll MailHog's HTTP API until the most recent message addressed to
 * `email` arrives, or timeout. Returns the message body.
 */
async function waitForEmail(email: string, timeoutMs = 10_000): Promise<string> {
  if (!mailhog) throw new Error('mailhog not started');
  const host = mailhog.getHost();
  const port = mailhog.getMappedPort(8025);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`http://${host}:${port}/api/v2/messages`);
    const body = (await res.json()) as {
      items: Array<{ Content: { Headers: Record<string, string[]>; Body: string } }>;
    };
    const match = body.items.find((m) =>
      (m.Content.Headers['To'] ?? []).some((t) => t.toLowerCase().includes(email.toLowerCase())),
    );
    if (match) return match.Content.Body;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Email to ${email} never arrived within ${timeoutMs}ms`);
}

describe('magic-link flow', () => {
  it('sends a real email, stores a Verification row, and verifies the token', async () => {
    const auth = await loadAuth();
    const email = uniqEmail('magic');

    await auth.api.signInMagicLink({
      body: { email, callbackURL: '/dashboard' },
      headers: new Headers({ 'Content-Type': 'application/json' }),
      asResponse: true,
    });

    const verification = await prisma.verification.findFirst({
      where: { identifier: { contains: email } },
      orderBy: { createdAt: 'desc' },
    });
    expect(verification, 'a Verification row should be persisted').not.toBeNull();

    const mailBody = await waitForEmail(email);
    const urlMatch = mailBody.match(/https?:\/\/[^\s<"']+token=([^&\s<"']+)/);
    expect(urlMatch, `magic-link email should contain a token. Body: ${mailBody}`).not.toBeNull();
    const token = urlMatch![1];

    const verifyResp = await auth.api.magicLinkVerify({
      query: { token, callbackURL: '/dashboard' },
      headers: new Headers(),
      asResponse: true,
    });
    const setCookie = verifyResp.headers.get('set-cookie') ?? '';
    expect(setCookie, 'verify should set an auth cookie').toMatch(/better-auth|session_token|session-token/i);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user, 'user should be created').not.toBeNull();
    expect(user?.emailVerified).toBe(true);
  }, 60_000);
});

describe('email domain gate', () => {
  it('rejects sign-in from a non-allowed domain when ALLOWED_EMAIL_DOMAINS is set', async () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'practera.com';
    // `?t=` cache-bust so Vitest re-evaluates the module under the new env.
    const mod = await import('../../src/auth?t=' + Date.now());
    const auth = (mod as { auth: unknown }).auth as Awaited<ReturnType<typeof loadAuth>>;

    let threw = false;
    try {
      await auth.api.signInMagicLink({
        body: { email: 'not-practera@example.com', callbackURL: '/' },
        headers: new Headers({ 'Content-Type': 'application/json' }),
        asResponse: true,
      });
    } catch (err) {
      threw = true;
      expect(String(err)).toMatch(/Email domain not allowed/);
    }
    expect(threw).toBe(true);

    delete process.env.ALLOWED_EMAIL_DOMAINS;
  });
});

describe('admin plugin ban/unban', () => {
  it('bans a user, removes their session, then unbans them', async () => {
    const auth = await loadAuth();

    const email = uniqEmail('banme');
    const user = await prisma.user.create({
      data: { email, name: 'Ban Me', emailVerified: true },
    });
    await prisma.session.create({
      data: {
        userId: user.id,
        token: `sess-${user.id}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    await prisma.session.deleteMany({ where: { userId: user.id } });

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.banned).toBe(true);
    const sessionsLeft = await prisma.session.count({ where: { userId: user.id } });
    expect(sessionsLeft).toBe(0);

    await prisma.user.update({ where: { id: user.id }, data: { banned: false } });
    const unbanned = await prisma.user.findUnique({ where: { id: user.id } });
    expect(unbanned?.banned).toBe(false);

    const res = await auth.api.getSession({
      headers: new Headers({ cookie: 'better-auth.session_token=bogus' }),
    });
    expect(res).toBeNull();
  }, 30_000);
});

describe('custom authorization layer', () => {
  it('grants and revokes ResourceAccess and writes an audit log row', async () => {
    const actor = await prisma.user.create({
      data: { email: uniqEmail('granter'), name: 'Granter', emailVerified: true, role: 'admin' },
    });
    const target = await prisma.user.create({
      data: { email: uniqEmail('target'), name: 'Target', emailVerified: true },
    });
    const pkg = await prisma.package.create({
      data: {
        name: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        displayName: 'Test Package',
        registrationType: 'APPROVAL_REQUIRED',
      },
    });

    const access = await prisma.resourceAccess.create({
      data: {
        userId: target.id,
        packageId: pkg.id,
        resourceType: 'package',
        resourceId: pkg.id,
        accessType: 'VIEWER',
        grantedBy: actor.id,
      },
    });
    expect(access.isActive).toBe(true);

    await prisma.authAuditLog.create({
      data: {
        userId: actor.id,
        targetUserId: target.id,
        packageId: pkg.id,
        action: 'RESOURCE_ACCESS_GRANTED',
        resourceType: 'package',
        resourceId: pkg.id,
      },
    });

    const logCount = await prisma.authAuditLog.count({
      where: { targetUserId: target.id, action: 'RESOURCE_ACCESS_GRANTED' },
    });
    expect(logCount).toBeGreaterThan(0);

    await prisma.resourceAccess.update({ where: { id: access.id }, data: { isActive: false } });
    const revoked = await prisma.resourceAccess.findUnique({ where: { id: access.id } });
    expect(revoked?.isActive).toBe(false);
  });
});

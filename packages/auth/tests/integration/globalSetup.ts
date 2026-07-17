/**
 * Global setup: boot a real Postgres in a container, run `prisma db push`
 * against the consolidated schema, and export `DATABASE_URL` for the suite.
 *
 * We deliberately run against the platform-monorepo's consolidated schema
 * (not just the auth package's schema) so the integration tests exercise the
 * same shape the production database has.
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import path from 'node:path';

let container: StartedPostgreSqlContainer | undefined;

export async function setup(): Promise<void> {
  // Honour BETTER_AUTH_TEST_DATABASE_URL for CI environments that provide
  // a pre-seeded Postgres (e.g. GitHub Actions services). Otherwise spin up
  // a container.
  if (!process.env.BETTER_AUTH_TEST_DATABASE_URL) {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('better_auth_test')
      .withUsername('test')
      .withPassword('test')
      .start();
    process.env.BETTER_AUTH_TEST_DATABASE_URL = container.getConnectionUri();
  }

  // Pin env for the test run.
  process.env.DATABASE_URL = process.env.BETTER_AUTH_TEST_DATABASE_URL;
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'integration-test-secret-do-not-reuse';
  process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
  process.env.TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS ?? 'http://localhost:3001';
  process.env.WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
  process.env.WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'Test RP';
  // Disable email gating for the shared suite; tests that need it enable it.
  delete process.env.ALLOWED_EMAIL_DOMAINS;

  // Run prisma db push against the platform's consolidated schema.
  const platformRoot = path.resolve(__dirname, '../../../..');
  try {
    execSync('npm run db:consolidate', { cwd: platformRoot, stdio: 'inherit' });
    execSync(
      `npx prisma db push --schema ${path.join(platformRoot, 'prisma', 'schema.prisma')} --skip-generate`,
      {
        cwd: platformRoot,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      },
    );
  } catch (err) {
    console.error('Failed to apply schema to test container:', err);
    throw err;
  }
}

export async function teardown(): Promise<void> {
  if (container) {
    await container.stop();
  }
}

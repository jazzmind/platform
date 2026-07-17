/**
 * Data migration from Auth.js (NextAuth v5 beta) to Better Auth.
 *
 * Contract:
 * - Preserves every row in the `User` table (id, email, name, image kept as-is).
 * - Sets `emailVerified` from the old DateTime? column to a boolean (true if any
 *   non-null value was present, or if the user has at least one linked OAuth
 *   account).
 * - Remaps `Account` rows to better-auth's shape:
 *     provider         -> providerId
 *     providerAccountId -> accountId
 *     refresh_token     -> refreshToken
 *     access_token      -> accessToken
 *     expires_at (Int)  -> accessTokenExpiresAt (DateTime)
 *     scope             -> scope
 *     id_token          -> idToken
 *   Legacy-only columns (token_type, session_state, refresh_token_expires_in)
 *   are dropped as better-auth does not use them.
 * - Truncates `Session`, `VerificationToken`, `Authenticator` and
 *   `PasskeyChallenge` (users must re-sign-in and re-enroll passkeys).
 * - Keeps every row of the custom authorization layer untouched.
 *
 * Run MANUALLY during a deploy window, against a database snapshot first:
 *   DATABASE_URL=... tsx packages/auth/scripts/migrate-to-better-auth.ts
 *
 * The script is idempotent: it checks table shape before remapping and will
 * skip any step that has already run.
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as exists`,
    name,
  );
  return rows[0]?.exists === true;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) as exists`,
    table,
    column,
  );
  return rows[0]?.exists === true;
}

async function migrateUsers(): Promise<void> {
  console.log('→ Migrating User.emailVerified (DateTime? -> Boolean)...');

  // If the column is already boolean we're done.
  const rows = await prisma.$queryRawUnsafe<{ data_type: string }[]>(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'emailVerified'`,
  );
  const dataType = rows[0]?.data_type;
  if (dataType === 'boolean') {
    console.log('  already boolean, skipping');
    return;
  }

  // Convert timestamp -> boolean with backfill: true if non-null OR user has an account.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN "emailVerified_new" BOOLEAN DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "User" SET "emailVerified_new" = true
    WHERE "emailVerified" IS NOT NULL
       OR "id" IN (SELECT DISTINCT "userId" FROM "Account");
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN "emailVerified";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" RENAME COLUMN "emailVerified_new" TO "emailVerified";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "emailVerified" SET NOT NULL;`);
  console.log('  done');
}

async function migrateAccounts(): Promise<void> {
  console.log('→ Migrating Account table to better-auth shape...');

  // If new columns already present, skip.
  if (await columnExists('Account', 'providerId')) {
    console.log('  already migrated, skipping');
    return;
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Account"
      ADD COLUMN "providerId" TEXT,
      ADD COLUMN "accountId" TEXT,
      ADD COLUMN "accessToken" TEXT,
      ADD COLUMN "refreshToken" TEXT,
      ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3),
      ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3),
      ADD COLUMN "idToken" TEXT,
      ADD COLUMN "password" TEXT,
      ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "Account" SET
      "providerId" = "provider",
      "accountId" = "providerAccountId",
      "accessToken" = "access_token",
      "refreshToken" = "refresh_token",
      "idToken" = "id_token",
      "accessTokenExpiresAt" = CASE
        WHEN "expires_at" IS NOT NULL THEN to_timestamp("expires_at")
        ELSE NULL
      END;
  `);

  // Drop old columns + unique constraint + index
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Account_provider_providerAccountId_key";`);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Account"
      DROP COLUMN "provider",
      DROP COLUMN "providerAccountId",
      DROP COLUMN "access_token",
      DROP COLUMN "refresh_token",
      DROP COLUMN "expires_at",
      DROP COLUMN "token_type",
      DROP COLUMN "id_token",
      DROP COLUMN "session_state",
      DROP COLUMN "type";
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Account"
      ALTER COLUMN "providerId" SET NOT NULL,
      ALTER COLUMN "accountId" SET NOT NULL,
      ALTER COLUMN "createdAt" SET NOT NULL,
      ALTER COLUMN "updatedAt" SET NOT NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX "Account_providerId_accountId_key"
      ON "Account"("providerId", "accountId");
  `);

  console.log('  done');
}

async function truncateInvalidated(): Promise<void> {
  console.log('→ Clearing invalidated tables (sessions, verifications, old passkeys)...');

  if (await tableExists('Session')) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Session";`);
  }
  if (await tableExists('VerificationToken')) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "VerificationToken" CASCADE;`);
  }
  if (await tableExists('Authenticator')) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Authenticator" CASCADE;`);
  }
  if (await tableExists('PasskeyChallenge')) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "PasskeyChallenge" CASCADE;`);
  }

  console.log('  done');
}

async function reshapeSession(): Promise<void> {
  console.log('→ Reshaping Session table to better-auth shape...');

  if (await columnExists('Session', 'token')) {
    console.log('  already migrated, skipping');
    return;
  }

  // Better-auth session needs: id, userId, token (unique), expiresAt,
  // ipAddress?, userAgent?, createdAt, updatedAt, impersonatedBy?
  // Old session had: id, sessionToken (unique), userId, expires
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Session"
      ADD COLUMN IF NOT EXISTS "token" TEXT,
      ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "impersonatedBy" TEXT;
  `);
  // Rename expires -> expiresAt if needed
  if (await columnExists('Session', 'expires')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Session" RENAME COLUMN "expires" TO "expiresAt";`);
  }
  // Drop old sessionToken column (table was truncated so no data loss)
  if (await columnExists('Session', 'sessionToken')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Session" DROP COLUMN "sessionToken";`);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Session"
      ALTER COLUMN "token" SET NOT NULL,
      ALTER COLUMN "createdAt" SET NOT NULL,
      ALTER COLUMN "updatedAt" SET NOT NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
  `);

  console.log('  done');
}

async function main(): Promise<void> {
  console.log('Starting better-auth data migration...');

  const userCount = await prisma.user.count().catch(() => -1);
  console.log(`  Starting User row count: ${userCount}`);

  await truncateInvalidated();
  await migrateUsers();
  await migrateAccounts();
  await reshapeSession();

  const after = await prisma.user.count();
  console.log(`  Ending User row count: ${after}`);

  if (userCount >= 0 && after !== userCount) {
    throw new Error(`User row count changed from ${userCount} to ${after} - aborting`);
  }

  console.log('Migration complete. Now run `npm run db:push` from the platform root.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

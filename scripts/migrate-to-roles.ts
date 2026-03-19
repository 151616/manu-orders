/**
 * One-time migration: Replace MemberPosition enum with table-driven Role system.
 *
 * Run with:  npx tsx --env-file=.env scripts/migrate-to-roles.ts
 *
 * Safe to re-run — uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: "Member",           permissionLevel: "VIEWER",      defaultRobot: null,    positionKey: "MEMBER" },
  { name: "Gamma Member",     permissionLevel: "VIEWER",      defaultRobot: "GAMMA", positionKey: "GAMMA_MEMBER" },
  { name: "Lambda Member",    permissionLevel: "VIEWER",      defaultRobot: "LAMBDA",positionKey: "LAMBDA_MEMBER" },
  { name: "Gamma Leadership", permissionLevel: "LEADERSHIP",  defaultRobot: "GAMMA", positionKey: "GAMMA_LEADERSHIP" },
  { name: "Lambda Leadership",permissionLevel: "LEADERSHIP",  defaultRobot: "LAMBDA",positionKey: "LAMBDA_LEADERSHIP" },
  { name: "Admin",            permissionLevel: "ADMIN",       defaultRobot: null,    positionKey: "ADMIN" },
  { name: "System Developer", permissionLevel: "SYSTEM_DEV",  defaultRobot: null,    positionKey: "SYSTEM_DEVELOPER" },
] as const;

async function main() {
  console.log("Starting RBAC migration...\n");

  // ── Step 1: Create Role table if it doesn't exist ─────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Role" (
      "id"              TEXT NOT NULL,
      "name"            TEXT NOT NULL,
      "permissionLevel" TEXT NOT NULL,
      "defaultRobot"    TEXT,
      "isProtected"     BOOLEAN NOT NULL DEFAULT false,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name")
  `);
  console.log("✓ Role table ensured");

  // ── Step 2: Seed default roles ─────────────────────────────────────────────
  const { v4: uuidv4 } = await import("uuid");
  const roleIdMap: Record<string, string> = {};

  for (const r of DEFAULT_ROLES) {
    const id = uuidv4();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Role" ("id","name","permissionLevel","defaultRobot","isProtected","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,true,NOW(),NOW())
      ON CONFLICT ("name") DO UPDATE SET
        "permissionLevel" = EXCLUDED."permissionLevel",
        "defaultRobot"    = EXCLUDED."defaultRobot",
        "isProtected"     = true,
        "updatedAt"       = NOW()
    `, id, r.name, r.permissionLevel, r.defaultRobot);

    // Fetch the actual ID (might differ if row already existed)
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "Role" WHERE "name" = $1`, r.name
    );
    roleIdMap[r.positionKey] = rows[0]!.id;
    console.log(`✓ Role seeded: "${r.name}" → ${r.permissionLevel}`);
  }

  // ── Step 3: Add roleId column to Member (if not present) ──────────────────
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "roleId" TEXT
  `);
  console.log("\n✓ roleId column added to Member");

  // ── Step 4: Populate roleId from existing position values ─────────────────
  let migrated = 0;
  for (const [positionKey, roleId] of Object.entries(roleIdMap)) {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "Member"
      SET "roleId" = $1
      WHERE "position"::TEXT = $2 AND "roleId" IS NULL
    `, roleId, positionKey);
    migrated += result as number;
  }
  console.log(`✓ Migrated ${migrated} member rows to roleId`);

  // ── Step 5: Set NOT NULL constraint on roleId ─────────────────────────────
  // First assign fallback role to any members that were missed
  const fallbackRoleId = roleIdMap["MEMBER"];
  await prisma.$executeRawUnsafe(`
    UPDATE "Member" SET "roleId" = $1 WHERE "roleId" IS NULL
  `, fallbackRoleId);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Member" ALTER COLUMN "roleId" SET NOT NULL
  `);
  console.log("✓ roleId NOT NULL constraint set");

  // ── Step 6: Add FK constraint (idempotent via named constraint) ───────────
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Member_roleId_fkey'
        AND table_name = 'Member'
      ) THEN
        ALTER TABLE "Member"
          ADD CONSTRAINT "Member_roleId_fkey"
          FOREIGN KEY ("roleId") REFERENCES "Role"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END
    $$
  `);
  console.log("✓ Foreign key constraint added");

  // ── Step 7: Drop old position column ──────────────────────────────────────
  const hasPosition = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='Member' AND column_name='position'
    ) as exists
  `);
  if (hasPosition[0]?.exists) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Member" DROP COLUMN "position"`);
    console.log("✓ Dropped old position column");
  } else {
    console.log("✓ position column already removed, skipping");
  }

  // ── Step 8: Drop MemberPosition enum (if exists) ──────────────────────────
  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "MemberPosition" CASCADE`);
  console.log("✓ Dropped MemberPosition enum");

  // ── Step 9: Create PermissionLevel enum (if not exists) ───────────────────
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PermissionLevel') THEN
        CREATE TYPE "PermissionLevel" AS ENUM ('VIEWER','LEADERSHIP','ADMIN','SYSTEM_DEV');
      END IF;
    END
    $$
  `);
  console.log("✓ PermissionLevel enum ensured");

  console.log("\n✅ RBAC migration complete!");
}

main()
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

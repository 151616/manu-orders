import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_ORDER' BEFORE 'NEW'`
    );
    console.log("SUCCESS: PENDING_ORDER added to OrderStatus enum");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ERROR (enum):", msg);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TeamCode" (
        "role"           TEXT NOT NULL PRIMARY KEY,
        "code"           TEXT NOT NULL,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedByLabel" TEXT
      )
    `);
    console.log("SUCCESS: TeamCode table ensured");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ERROR (TeamCode table):", msg);
  }

  // Create MemberSubteam enum type if it doesn't exist
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "MemberSubteam" AS ENUM (
          'ASSEMBLY', 'ELECTRICAL', 'MANUFACTURING', 'BUSINESS', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("SUCCESS: MemberSubteam enum ensured");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ERROR (MemberSubteam enum):", msg);
  }

  // Add SYSTEM_DEVELOPER to MemberPosition if the type exists, or create it fresh
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "MemberPosition" AS ENUM (
          'MEMBER', 'GAMMA_LEADERSHIP', 'LAMBDA_LEADERSHIP', 'ADMIN', 'SYSTEM_DEVELOPER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("SUCCESS: MemberPosition enum ensured");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ERROR (MemberPosition enum):", msg);
  }

  // Add any missing values to MemberPosition (handles upgrades from old schemas)
  for (const value of ["SYSTEM_DEVELOPER", "GAMMA_LEADERSHIP", "LAMBDA_LEADERSHIP", "GAMMA_MEMBER", "LAMBDA_MEMBER"]) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "MemberPosition" ADD VALUE IF NOT EXISTS '${value}'`
      );
      console.log(`SUCCESS: ${value} added to MemberPosition enum`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`ERROR (MemberPosition ${value}):`, msg);
    }
  }

  // Create Member table using the proper enum types
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Member" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "firstName" TEXT NOT NULL,
        "lastName"  TEXT NOT NULL,
        "subteam"   "MemberSubteam" NOT NULL,
        "position"  "MemberPosition" NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("firstName", "lastName")
      )
    `);
    console.log("SUCCESS: Member table ensured");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("ERROR (Member table):", msg);
  }

  await prisma.$disconnect();
}

main();

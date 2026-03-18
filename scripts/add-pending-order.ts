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

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Member" (
        "id"        TEXT NOT NULL PRIMARY KEY,
        "firstName" TEXT NOT NULL,
        "lastName"  TEXT NOT NULL,
        "subteam"   TEXT NOT NULL,
        "position"  TEXT NOT NULL,
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

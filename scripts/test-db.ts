import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import "dotenv/config";

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  console.log("DATABASE_URL:", databaseUrl ? "Configured" : "MISSING");
  
  if (!databaseUrl) return;

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    console.log("Attempting to query database...");
    const count = await prisma.loginAttempt.count();
    console.log("Success! LoginAttempt count:", count);
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

testConnection();

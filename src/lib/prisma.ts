import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function normalizeDatabaseUrl(rawValue: string) {
  let value = rawValue.trim();

  const hasWrappedDoubleQuotes =
    value.startsWith("\"") && value.endsWith("\"");
  const hasWrappedSingleQuotes =
    value.startsWith("'") && value.endsWith("'");

  if (hasWrappedDoubleQuotes || hasWrappedSingleQuotes) {
    value = value.slice(1, -1).trim();
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (!isLocalHost) {
      // Disable SSL to avoid certificate verification issues with Prisma's WASM/Rustls engine.
      // Cloud SQL (and most hosted DBs) accept plain TCP connections via authorized networks.
      parsed.searchParams.set("sslmode", "disable");
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

function createPrismaClient() {
  const databaseUrlRaw = process.env.DATABASE_URL?.trim();

  if (!databaseUrlRaw) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrlRaw);
  process.env.DATABASE_URL = normalizedDatabaseUrl;

  let ssl: boolean | { rejectUnauthorized: boolean } = false;

  try {
    const parsed = new URL(normalizedDatabaseUrl);
    const host = parsed.hostname.toLowerCase();
    const isLocalHost =
      host === "localhost" || host === "127.0.0.1" || host === "::1";
    ssl = false; // SSL handled at the URL level via sslmode parameter
  } catch {
    // Leave ssl at default false if parsing fails; Prisma/pg will surface detailed errors later.
  }

  const adapter = new PrismaPg({
    connectionString: normalizedDatabaseUrl,
    ssl,
    max: 3,
    connectionTimeoutMillis: 15000,
  });

  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;

  // Eagerly start connecting so the first user request doesn't pay the cold-start cost.
  void client.$connect().catch((err: unknown) => {
    console.error("[Prisma] Pre-connect failed:", err);
  });

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

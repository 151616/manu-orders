import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_PER_IP = 20;
const MAX_FAILED_ATTEMPTS_PER_EMAIL = 8;

export async function getRequestIpAddress(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function normalizeLoginEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "<invalid-email>";
}

export async function isLoginRateLimited({
  email,
  ipAddress,
}: {
  email: string;
  ipAddress: string;
}): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const [ipFailures, emailFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        success: false,
        ipAddress,
        createdAt: { gte: windowStart },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        success: false,
        email,
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  return (
    ipFailures >= MAX_FAILED_ATTEMPTS_PER_IP ||
    emailFailures >= MAX_FAILED_ATTEMPTS_PER_EMAIL
  );
}

export async function recordLoginAttempt({
  email,
  ipAddress,
  success,
}: {
  email: string;
  ipAddress: string;
  success: boolean;
}) {
  await prisma.loginAttempt.create({
    data: {
      email,
      ipAddress,
      success,
    },
  });
}

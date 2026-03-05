import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_PER_SCOPE_IP = 8;

export const AUTH_ATTEMPT_SCOPES = ["login", "elevate"] as const;
export type AuthAttemptScope = (typeof AUTH_ATTEMPT_SCOPES)[number];

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

export async function isAuthAttemptRateLimited({
  scope,
  ipAddress,
}: {
  scope: AuthAttemptScope;
  ipAddress: string;
}): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const ipFailuresForScope = await prisma.loginAttempt.count({
    where: {
      success: false,
      scope,
      ipAddress,
      createdAt: { gte: windowStart },
    },
  });

  return ipFailuresForScope >= MAX_FAILED_ATTEMPTS_PER_SCOPE_IP;
}

export async function recordAuthAttempt({
  scope,
  key,
  ipAddress,
  success,
}: {
  scope: AuthAttemptScope;
  key: string;
  ipAddress: string;
  success: boolean;
}) {
  await prisma.loginAttempt.create({
    data: {
      scope,
      email: key,
      ipAddress,
      success,
    },
  });
}

export async function isLoginRateLimited({
  ipAddress,
}: {
  ipAddress: string;
}) {
  return isAuthAttemptRateLimited({
    scope: "login",
    ipAddress,
  });
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
  await recordAuthAttempt({
    scope: "login",
    key: email,
    ipAddress,
    success,
  });
}

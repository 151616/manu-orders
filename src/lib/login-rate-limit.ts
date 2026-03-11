import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_PER_SCOPE_IP = 8;
const RATE_LIMIT_QUERY_TIMEOUT_MS = 2000;

export const AUTH_ATTEMPT_SCOPES = [
  "login",
  "elevate",
  "vendor_capture",
] as const;
export type AuthAttemptScope = (typeof AUTH_ATTEMPT_SCOPES)[number];

function logRateLimitDebug(event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (details) {
    console.warn(`[Auth RateLimit] ${timestamp} ${event}`, details);
    return;
  }
  console.warn(`[Auth RateLimit] ${timestamp} ${event}`);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutErrorMessage: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

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
  const startedAt = Date.now();

  try {
    const ipFailuresForScope = await withTimeout(
      prisma.loginAttempt.count({
        where: {
          success: false,
          scope,
          ipAddress,
          createdAt: { gte: windowStart },
        },
      }),
      RATE_LIMIT_QUERY_TIMEOUT_MS,
      "Rate-limit count timed out.",
    );

    return ipFailuresForScope >= MAX_FAILED_ATTEMPTS_PER_SCOPE_IP;
  } catch (error) {
    logRateLimitDebug("count-failed-fail-open", {
      scope,
      ipAddress,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
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
  const startedAt = Date.now();
  try {
    const writePromise = prisma.loginAttempt.create({
      data: {
        scope,
        email: key,
        ipAddress,
        success,
      },
    });

    void withTimeout(
      writePromise,
      RATE_LIMIT_QUERY_TIMEOUT_MS,
      "Rate-limit write timed out.",
    ).catch((error) => {
      logRateLimitDebug("write-failed-skip", {
        scope,
        ipAddress,
        success,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    logRateLimitDebug("write-failed-skip", {
      scope,
      ipAddress,
      success,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

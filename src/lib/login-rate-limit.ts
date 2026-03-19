import { headers } from "next/headers";

/**
 * Simple in-memory rate limiter.
 * Resets on server restart — good enough for a small team app.
 * No Prisma / DB dependency.
 */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 8;

type AttemptRecord = { count: number; windowStart: number };
const store = new Map<string, AttemptRecord>();

function getKey(scope: string, ip: string) {
  return `${scope}:${ip}`;
}

export async function getRequestIpAddress(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  if (realIp) return realIp.trim();
  return "unknown";
}

export function isRateLimited(scope: string, ipAddress: string): boolean {
  const key = getKey(scope, ipAddress);
  const record = store.get(key);
  if (!record) return false;

  if (Date.now() - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    store.delete(key);
    return false;
  }

  return record.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailedAttempt(scope: string, ipAddress: string): void {
  const key = getKey(scope, ipAddress);
  const existing = store.get(key);
  const now = Date.now();

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
  } else {
    existing.count += 1;
  }
}

export function clearAttempts(scope: string, ipAddress: string): void {
  store.delete(getKey(scope, ipAddress));
}

/* ------------------------------------------------------------------ */
/*  Backwards-compatible exports (used by vendor-capture, etc.)       */
/* ------------------------------------------------------------------ */

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase() || "<invalid>";
}

export async function isAuthAttemptRateLimited({
  scope,
  ipAddress,
}: {
  scope: string;
  ipAddress: string;
}): Promise<boolean> {
  return isRateLimited(scope, ipAddress);
}

export async function recordAuthAttempt({
  scope,
  key: _key,
  ipAddress,
  success,
}: {
  scope: string;
  key: string;
  ipAddress: string;
  success: boolean;
}): Promise<void> {
  if (!success) {
    recordFailedAttempt(scope, ipAddress);
  }
}

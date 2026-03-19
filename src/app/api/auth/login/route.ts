import { NextRequest, NextResponse } from "next/server";
import {
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/login-rate-limit";
import {
  type PermissionLevel,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
} from "@/lib/session";
import { usersCollection } from "@/lib/firestore";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/* ------------------------------------------------------------------ */
/*  POST /api/auth/login                                              */
/*  Body: { userId: string, pin: string }                             */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const ip = getIp(request);

    // Rate limit by IP (global) as a first check
    if (isRateLimited("login-ip", ip)) {
      return jsonError(429, "Too many login attempts. Please try again later.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid request.");
    }

    if (!body || typeof body !== "object") {
      return jsonError(400, "Invalid request.");
    }

    const record = body as Record<string, unknown>;
    const userId =
      typeof record.userId === "string" ? record.userId.trim() : "";
    const pin = typeof record.pin === "string" ? record.pin.trim() : "";

    if (!userId) {
      return jsonError(400, "Please select your name.");
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      recordFailedAttempt("login-ip", ip);
      recordFailedAttempt("login-user", userId);
      return jsonError(400, "Please enter a valid 4-digit PIN.");
    }

    // Rate limit by userId (per-account protection)
    if (isRateLimited("login-user", userId)) {
      return jsonError(
        429,
        "This account is temporarily locked due to too many failed attempts. Please try again later.",
      );
    }

    // ── Look up user by document ID ──────────────────────────────────
    const docRef = usersCollection().doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      recordFailedAttempt("login-ip", ip);
      recordFailedAttempt("login-user", userId);
      return jsonError(401, "Invalid credentials.");
    }

    const userData = doc.data()!;
    const storedPin = (userData.pin as string) ?? "";

    if (storedPin !== pin) {
      recordFailedAttempt("login-ip", ip);
      recordFailedAttempt("login-user", userId);
      return jsonError(401, "Invalid PIN.");
    }

    const permissionLevel = (userData.permissionLevel ?? 5) as PermissionLevel;

    // Build session token
    const token = await signSessionToken({
      userId: doc.id,
      name: userData.nickname || "User",
      permissionLevel,
      position: userData.position || "",
    });

    clearAttempts("login-ip", ip);
    clearAttempts("login-user", userId);

    // If pending (level 5), still issue a session but redirect to /pending
    const redirectTo = permissionLevel === 5 ? "/pending" : "/queue";

    const response = NextResponse.json({ redirectTo }, { status: 200 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("[Auth Login] Unexpected failure.", error);
    return jsonError(503, "Login is temporarily unavailable. Please try again.");
  }
}

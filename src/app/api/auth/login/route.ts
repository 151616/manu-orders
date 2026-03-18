import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  isAuthAttemptRateLimited,
  normalizeLoginEmail,
  recordAuthAttempt,
} from "@/lib/login-rate-limit";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  UserRoleValue,
  signSessionToken,
} from "@/lib/session";

type TeamRoleIdentity = {
  id: string;
  role: UserRoleValue;
  name: string;
};

const TEAM_ROLE_IDENTITIES: Record<UserRoleValue, TeamRoleIdentity> = {
  MEMBER: {
    id: "session-member",
    role: "MEMBER",
    name: "Member",
  },
  ADMIN: {
    id: "session-admin",
    role: "ADMIN",
    name: "Admin",
  },
};

const RATE_LIMIT_KEY = normalizeLoginEmail("role:code-login");

function secureCodeMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function getExpectedRoleCode(role: UserRoleValue) {
  const rawCode =
    role === "ADMIN"
      ? process.env.TEAM_ADMIN_CODE ?? process.env.TEAM_MANU_CODE
      : process.env.TEAM_ACCESS_CODE;
  if (!rawCode) return null;
  const normalized = rawCode.trim();
  return normalized.length > 0 ? normalized : null;
}



function detectRole(code: string): UserRoleValue | null {
  const sysCode = process.env.SYSTEM_OPERATOR_CODE?.trim();
  if (sysCode && secureCodeMatch(code, sysCode)) return "ADMIN";
  const adminCode = getExpectedRoleCode("ADMIN");
  if (adminCode && secureCodeMatch(code, adminCode)) return "ADMIN";
  const memberCode = getExpectedRoleCode("MEMBER");
  if (memberCode && secureCodeMatch(code, memberCode)) return "MEMBER";
  return null;
}

function getRequestIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  if (realIp) return realIp.trim();
  return "unknown";
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  try {
    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    const code =
      payload &&
      typeof payload === "object" &&
      "code" in payload &&
      typeof payload.code === "string"
        ? payload.code.trim()
        : "";

    const ipAddress = getRequestIpAddress(request);

    const rateLimited = await isAuthAttemptRateLimited({
      scope: "login",
      ipAddress,
    });
    if (rateLimited) {
      return jsonError(429, "Too many login attempts. Please try again later.");
    }

    if (!code) {
      await recordAuthAttempt({
        scope: "login",
        key: RATE_LIMIT_KEY,
        ipAddress,
        success: false,
      });
      return jsonError(400, "Invalid access code.");
    }

    const role = detectRole(code);

    if (!role) {
      await recordAuthAttempt({
        scope: "login",
        key: RATE_LIMIT_KEY,
        ipAddress,
        success: false,
      });
      return jsonError(401, "Invalid access code.");
    }

    const identity = TEAM_ROLE_IDENTITIES[role];
    const token = await signSessionToken({
      userId: identity.id,
      role: identity.role,
      name: identity.name,
    });

    await recordAuthAttempt({
      scope: "login",
      key: RATE_LIMIT_KEY,
      ipAddress,
      success: true,
    });

    const response = NextResponse.json({ redirectTo: "/queue" }, { status: 200 });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[Auth Login] Unexpected failure.", error);
    return jsonError(503, "Login is temporarily unavailable. Please try again.");
  }
}

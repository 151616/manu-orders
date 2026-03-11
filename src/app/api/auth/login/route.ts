import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const loginSchema = z.object({
  role: z.enum(["VIEWER", "ADMIN"]),
  roleCode: z.string().min(1),
});

type TeamRoleIdentity = {
  id: string;
  role: UserRoleValue;
  name: string;
};

const TEAM_ROLE_IDENTITIES: Record<UserRoleValue, TeamRoleIdentity> = {
  VIEWER: {
    id: "session-viewer",
    role: "VIEWER",
    name: "Viewer Demo",
  },
  ADMIN: {
    id: "session-admin",
    role: "ADMIN",
    name: "Admin Demo",
  },
};

function roleRateLimitKey(role: UserRoleValue) {
  return normalizeLoginEmail(`role:${role.toLowerCase()}`);
}

function secureCodeMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function getExpectedRoleCode(role: UserRoleValue) {
  const rawCode =
    role === "ADMIN"
      ? process.env.TEAM_ADMIN_CODE ?? process.env.TEAM_MANU_CODE
      : process.env.TEAM_ACCESS_CODE;

  if (!rawCode) {
    return null;
  }

  const normalized = rawCode.trim();
  return normalized.length > 0 ? normalized : null;
}

function getRequestIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (realIp) {
    return realIp.trim();
  }

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

    const parsed = loginSchema.safeParse({
      role:
        payload &&
        typeof payload === "object" &&
        "role" in payload &&
        typeof payload.role === "string"
          ? payload.role
          : "",
      roleCode:
        payload &&
        typeof payload === "object" &&
        "roleCode" in payload &&
        typeof payload.roleCode === "string"
          ? payload.roleCode.trim()
          : "",
    });

    const ipAddress = getRequestIpAddress(request);
    const limiterKey = parsed.success
      ? roleRateLimitKey(parsed.data.role)
      : normalizeLoginEmail("role:invalid");

    const rateLimited = await isAuthAttemptRateLimited({
      scope: "login",
      ipAddress,
    });
    if (rateLimited) {
      return jsonError(429, "Too many login attempts. Please try again later.");
    }

    if (!parsed.success) {
      await recordAuthAttempt({
        scope: "login",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return jsonError(400, "Invalid access code.");
    }

    const expectedCode = getExpectedRoleCode(parsed.data.role);
    if (!expectedCode) {
      return jsonError(503, "Login is unavailable. Contact an administrator.");
    }

    const isValid = secureCodeMatch(parsed.data.roleCode, expectedCode);
    if (!isValid) {
      await recordAuthAttempt({
        scope: "login",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return jsonError(401, "Invalid access code.");
    }

    const identity = TEAM_ROLE_IDENTITIES[parsed.data.role];
    const token = await signSessionToken({
      userId: identity.id,
      role: identity.role,
      name: identity.name,
    });

    await recordAuthAttempt({
      scope: "login",
      key: limiterKey,
      ipAddress,
      success: true,
    });

    const response = NextResponse.json(
      {
        redirectTo: "/queue",
      },
      { status: 200 },
    );

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

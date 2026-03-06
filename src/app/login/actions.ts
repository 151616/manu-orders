"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { handleServerMutationError } from "@/lib/action-errors";
import {
  getRequestIpAddress,
  isAuthAttemptRateLimited,
  normalizeLoginEmail,
  recordAuthAttempt,
} from "@/lib/login-rate-limit";
import { UserRoleValue } from "@/lib/session";

const loginSchema = z.object({
  role: z.enum(["VIEWER", "ADMIN"]),
  roleCode: z.string().min(1),
});

const LOGIN_FAILED_MESSAGE =
  "Unable to complete login right now. Please try again.";

type LoginActionState = {
  error: string | null;
};

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

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    const roleValue = formData.get("role");
    const roleCodeValue = formData.get("roleCode");

    const parsed = loginSchema.safeParse({
      role: typeof roleValue === "string" ? roleValue : "",
      roleCode: typeof roleCodeValue === "string" ? roleCodeValue.trim() : "",
    });

    const ipAddress = await getRequestIpAddress();
    const limiterKey = parsed.success
      ? roleRateLimitKey(parsed.data.role)
      : normalizeLoginEmail("role:invalid");

    const rateLimited = await isAuthAttemptRateLimited({
      scope: "login",
      ipAddress,
    });
    if (rateLimited) {
      return { error: "Too many login attempts. Please try again later." };
    }

    if (!parsed.success) {
      await recordAuthAttempt({
        scope: "login",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return { error: "Invalid access code." };
    }

    const expectedCode = getExpectedRoleCode(parsed.data.role);
    if (!expectedCode) {
      return { error: "Login is unavailable. Contact an administrator." };
    }

    const isValid = secureCodeMatch(parsed.data.roleCode, expectedCode);

    if (!isValid) {
      await recordAuthAttempt({
        scope: "login",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return { error: "Invalid access code." };
    }

    const identity = TEAM_ROLE_IDENTITIES[parsed.data.role];

    await createSession({
      id: identity.id,
      role: identity.role,
      name: identity.name,
    });

    await recordAuthAttempt({
      scope: "login",
      key: limiterKey,
      ipAddress,
      success: true,
    });
  } catch (error) {
    return {
      error: handleServerMutationError("loginAction", error, LOGIN_FAILED_MESSAGE),
    };
  }

  redirect("/queue");
}

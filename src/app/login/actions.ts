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
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN"]),
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

async function getExpectedRoleCode(role: UserRoleValue): Promise<string | null> {
  // DB override takes priority (allows runtime password changes)
  try {
    const dbCode = await prisma.teamCode.findUnique({ where: { role } });
    if (dbCode?.code?.trim()) return dbCode.code.trim();
  } catch {
    // DB unavailable — fall through to env var
  }

  const rawCode =
    role === "ADMIN"
      ? process.env.TEAM_ADMIN_CODE ?? process.env.TEAM_MANU_CODE
      : role === "MEMBER"
        ? process.env.TEAM_ACCESS_CODE
        : null;

  if (!rawCode) return null;
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

    const expectedCode = await getExpectedRoleCode(parsed.data.role);
    const sysCode = process.env.SYSTEM_OPERATOR_CODE?.trim() || null;

    // System operator code works as admin login regardless of selected role
    const isSystemOperator = sysCode && secureCodeMatch(parsed.data.roleCode, sysCode);

    if (!isSystemOperator) {
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
    }

    // System operator always logs in as admin
    const identity = isSystemOperator
      ? TEAM_ROLE_IDENTITIES["ADMIN"]
      : TEAM_ROLE_IDENTITIES[parsed.data.role];

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

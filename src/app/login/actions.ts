"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import {
  getRequestIpAddress,
  isLoginRateLimited,
  normalizeLoginEmail,
  recordLoginAttempt,
} from "@/lib/login-rate-limit";
import { UserRoleValue } from "@/lib/session";

const loginSchema = z.object({
  role: z.enum(["REQUESTER", "MANUFACTURING"]),
  accessCode: z.string().min(1),
  manufacturingCode: z.string().optional(),
});

type LoginActionState = {
  error: string | null;
};

type TeamRoleIdentity = {
  id: string;
  role: UserRoleValue;
  name: string;
};

const TEAM_ROLE_IDENTITIES: Record<UserRoleValue, TeamRoleIdentity> = {
  REQUESTER: {
    id: "session-requester",
    role: "REQUESTER",
    name: "Requester Demo",
  },
  MANUFACTURING: {
    id: "session-manufacturing",
    role: "MANUFACTURING",
    name: "Manu Demo",
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

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const roleValue = formData.get("role");
  const accessCodeValue = formData.get("accessCode");
  const manufacturingCodeValue = formData.get("manufacturingCode");

  const parsed = loginSchema.safeParse({
    role: typeof roleValue === "string" ? roleValue : "",
    accessCode: typeof accessCodeValue === "string" ? accessCodeValue : "",
    manufacturingCode:
      typeof manufacturingCodeValue === "string" ? manufacturingCodeValue : "",
  });

  const ipAddress = await getRequestIpAddress();
  const limiterKey = parsed.success
    ? roleRateLimitKey(parsed.data.role)
    : normalizeLoginEmail("role:invalid");

  const rateLimited = await isLoginRateLimited({
    email: limiterKey,
    ipAddress,
  });
  if (rateLimited) {
    return { error: "Too many login attempts. Please try again later." };
  }

  if (!parsed.success) {
    await recordLoginAttempt({
      email: limiterKey,
      ipAddress,
      success: false,
    });
    return { error: "Invalid access code." };
  }

  const teamAccessCode = process.env.TEAM_ACCESS_CODE;
  if (!teamAccessCode) {
    return { error: "Login is unavailable. Contact an administrator." };
  }

  let isValid = secureCodeMatch(parsed.data.accessCode, teamAccessCode);
  if (parsed.data.role === "MANUFACTURING") {
    const teamManuCode = process.env.TEAM_MANU_CODE;
    if (!teamManuCode) {
      return { error: "Login is unavailable. Contact an administrator." };
    }

    isValid =
      isValid &&
      secureCodeMatch(parsed.data.manufacturingCode ?? "", teamManuCode);
  }

  if (!isValid) {
    await recordLoginAttempt({
      email: limiterKey,
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

  await recordLoginAttempt({
    email: limiterKey,
    ipAddress,
    success: true,
  });
  redirect("/queue");
}

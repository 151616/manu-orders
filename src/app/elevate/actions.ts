"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, requireAuth } from "@/lib/auth";
import { handleServerMutationError } from "@/lib/action-errors";
import {
  getRequestIpAddress,
  isAuthAttemptRateLimited,
  normalizeLoginEmail,
  recordAuthAttempt,
} from "@/lib/login-rate-limit";

const elevateSchema = z.object({
  accessCode: z.string().min(1),
  adminCode: z.string().min(1),
});

const ELEVATE_FAILED_MESSAGE =
  "Unable to complete elevation right now. Please try again.";

export type ElevateActionState = {
  error: string | null;
};

function secureCodeMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function elevateAction(
  _previousState: ElevateActionState,
  formData: FormData,
): Promise<ElevateActionState> {
  const user = await requireAuth();
  if (user.role === "ADMIN") {
    redirect("/queue");
  }

  try {
    const accessCodeValue = formData.get("accessCode");
    const adminCodeValue = formData.get("adminCode");

    const parsed = elevateSchema.safeParse({
      accessCode: typeof accessCodeValue === "string" ? accessCodeValue.trim() : "",
      adminCode: typeof adminCodeValue === "string" ? adminCodeValue.trim() : "",
    });

    const ipAddress = await getRequestIpAddress();
    const limiterKey = normalizeLoginEmail(`elevate:${user.id}`);
    const rateLimited = await isAuthAttemptRateLimited({
      scope: "elevate",
      ipAddress,
    });
    if (rateLimited) {
      return { error: "Too many elevation attempts. Please try again later." };
    }

    if (!parsed.success) {
      await recordAuthAttempt({
        scope: "elevate",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return { error: "Invalid admin code." };
    }

    const teamAccessCode = process.env.TEAM_ACCESS_CODE?.trim() ?? "";
    const teamAdminCode =
      (process.env.TEAM_ADMIN_CODE ?? process.env.TEAM_MANU_CODE)?.trim() ?? "";
    if (!teamAccessCode || !teamAdminCode) {
      return { error: "Elevation is unavailable. Contact an administrator." };
    }

    const valid =
      secureCodeMatch(parsed.data.accessCode, teamAccessCode) &&
      secureCodeMatch(parsed.data.adminCode, teamAdminCode);

    if (!valid) {
      await recordAuthAttempt({
        scope: "elevate",
        key: limiterKey,
        ipAddress,
        success: false,
      });
      return { error: "Invalid admin code." };
    }

    await createSession({
      id: "session-admin",
      role: "ADMIN",
      name: "Admin Demo",
    });

    await recordAuthAttempt({
      scope: "elevate",
      key: limiterKey,
      ipAddress,
      success: true,
    });
  } catch (error) {
    return {
      error: handleServerMutationError(
        "elevateAction",
        error,
        ELEVATE_FAILED_MESSAGE,
      ),
    };
  }

  redirect("/queue?toast=elevated&tone=success");
}

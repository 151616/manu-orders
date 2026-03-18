"use server";

import { timingSafeEqual } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRoleValue } from "@/lib/session";

type ChangeCodeResult =
  | { ok: true }
  | { ok: false; error: string };

async function getEffectiveCode(role: UserRoleValue): Promise<string | null> {
  try {
    const dbCode = await prisma.teamCode.findUnique({ where: { role } });
    if (dbCode?.code?.trim()) return dbCode.code.trim();
  } catch {
    // fall through
  }
  const rawCode =
    role === "ADMIN"
      ? process.env.TEAM_ADMIN_CODE ?? process.env.TEAM_MANU_CODE
      : role === "MEMBER"
        ? process.env.TEAM_ACCESS_CODE
        : null;
  const normalized = rawCode?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function getSystemOperatorCode(): string | null {
  const raw = process.env.SYSTEM_OPERATOR_CODE?.trim() ?? "";
  return raw.length > 0 ? raw : null;
}

function secureMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function changeViewerCode(
  currentCode: string,
  newCode: string,
): Promise<ChangeCodeResult> {
  const admin = await requireAdmin();

  const trimmedCurrent = currentCode.trim();
  const trimmedNew = newCode.trim();

  if (!trimmedNew || trimmedNew.length < 4) {
    return { ok: false, error: "New code must be at least 4 characters." };
  }

  // Verify against admin code or system operator code
  const adminCode = await getEffectiveCode("ADMIN");
  const sysCode = getSystemOperatorCode();

  const validCurrent =
    (adminCode && secureMatch(trimmedCurrent, adminCode)) ||
    (sysCode && secureMatch(trimmedCurrent, sysCode));

  if (!validCurrent) {
    return { ok: false, error: "Current admin code is incorrect." };
  }

  await prisma.teamCode.upsert({
    where: { role: "MEMBER" },
    create: { role: "MEMBER", code: trimmedNew, updatedByLabel: admin.label },
    update: { code: trimmedNew, updatedByLabel: admin.label },
  });

  return { ok: true };
}

export async function changeAdminCode(
  currentCode: string,
  newCode: string,
): Promise<ChangeCodeResult> {
  const admin = await requireAdmin();

  const trimmedCurrent = currentCode.trim();
  const trimmedNew = newCode.trim();

  if (!trimmedNew || trimmedNew.length < 4) {
    return { ok: false, error: "New code must be at least 4 characters." };
  }

  const sysCode = getSystemOperatorCode();
  if (!sysCode || !secureMatch(trimmedCurrent, sysCode)) {
    return { ok: false, error: "System operator code is incorrect." };
  }

  await prisma.teamCode.upsert({
    where: { role: "ADMIN" },
    create: { role: "ADMIN", code: trimmedNew, updatedByLabel: admin.label },
    update: { code: trimmedNew, updatedByLabel: admin.label },
  });

  return { ok: true };
}

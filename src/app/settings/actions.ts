"use server";

// Settings actions — Prisma removed. Will be rebuilt with Firestore.

import { requireAdmin } from "@/lib/auth";

type ChangeCodeResult = { ok: true } | { ok: false; error: string };

export async function changePositionCode(
  _position: string,
  _currentCode: string,
  _newCode: string,
): Promise<ChangeCodeResult> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

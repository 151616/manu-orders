"use server";

import { requireAdmin } from "@/lib/auth";
import { usersCollection } from "@/lib/firestore";
import { FieldValue } from "firebase-admin/firestore";

export type MemberRow = {
  id: string;
  nickname: string;
  position: string;
  subteam: string;
  permissionLevel: number;
};

export async function getMembers(): Promise<MemberRow[]> {
  await requireAdmin();

  const snapshot = await usersCollection()
    .orderBy("nickname", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      nickname: d.nickname ?? "",
      position: d.position ?? "",
      subteam: d.subteam ?? "",
      permissionLevel: d.permissionLevel ?? 5,
    };
  });
}

export async function updateMemberProfile(
  id: string,
  data: { nickname: string; position: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const nickname = data.nickname.trim();
  const position = data.position.trim();

  if (!nickname) return { ok: false, error: "Name is required." };
  if (!position) return { ok: false, error: "Position is required." };

  try {
    await usersCollection().doc(id).update({
      nickname,
      position,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update user." };
  }
}

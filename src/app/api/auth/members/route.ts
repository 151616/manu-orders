"use server";

import { NextResponse } from "next/server";
import { usersCollection } from "@/lib/firestore";

/**
 * GET /api/auth/members
 * Returns a list of { id, name } for the login name picker.
 * Only returns non-pending users (permissionLevel < 5).
 */
export async function GET() {
  try {
    const snapshot = await usersCollection().get();

    const members = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: (data.nickname as string) || "Unknown",
          level: (data.permissionLevel as number) ?? 5,
        };
      })
      .filter((m) => m.level < 5)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("[Auth Members] Failed to fetch member list.", error);
    return NextResponse.json({ members: [] }, { status: 200 });
  }
}

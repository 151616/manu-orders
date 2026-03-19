"use server";

import { usersCollection } from "@/lib/firestore";
import { FieldValue } from "firebase-admin/firestore";

const BANNED_PINS = ["9477", "8366", "1111", "0000", "1234", "4321"];

export type RegisterResult = {
  success: boolean;
  error?: string;
};

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const firstName = (formData.get("firstName") as string)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const pin = (formData.get("pin") as string)?.trim() ?? "";
  const position = (formData.get("position") as string)?.trim() ?? "";
  const subteam = (formData.get("subteam") as string)?.trim() ?? "";

  // ── Validation ──────────────────────────────────────────────────────
  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required." };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: "PIN must be exactly 4 digits." };
  }

  if (BANNED_PINS.includes(pin)) {
    return {
      success: false,
      error: "That PIN is not allowed. Please choose a different one.",
    };
  }

  // Check all repeating digits (2222, 3333, etc.)
  if (/^(\d)\1{3}$/.test(pin)) {
    return {
      success: false,
      error: "PIN cannot be all the same digit. Please choose a different one.",
    };
  }

  if (!position) {
    return { success: false, error: "Please enter your position on the team." };
  }

  // ── Insert into Firestore ───────────────────────────────────────────
  try {
    const nickname = `${firstName} ${lastName}`;

    const docRef = await usersCollection().add({
      pin, // Plain text — visible to Level 0 in Firebase console
      nickname,
      position,
      subteam: subteam || "",
      permissionLevel: 5, // Pending / Unapproved
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Write the auto-generated doc ID back as a field so it's visible in the console
    await docRef.update({ userId: docRef.id });

    // TODO: Send Slack notification here (Step N)

    return { success: true };
  } catch (error) {
    console.error("[Register] Failed to create user:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

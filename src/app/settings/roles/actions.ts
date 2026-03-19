"use server";

// Roles actions — Prisma removed. Will be rebuilt with Firestore.

import { requireAdmin } from "@/lib/auth";

export type RoleRow = {
  id: string;
  name: string;
  permissionLevel: string;
  defaultRobot: string | null;
  isProtected: boolean;
  memberCount: number;
};

export type RoleOption = {
  id: string;
  name: string;
  permissionLevel: string;
  defaultRobot: string | null;
};

export async function getRoles(): Promise<RoleRow[]> {
  await requireAdmin();
  return [];
}

export async function getRoleOptions(): Promise<RoleOption[]> {
  await requireAdmin();
  return [];
}

export async function createRole(
  _name: string,
  _permissionLevel: string,
  _defaultRobot: string | null,
): Promise<{ ok: true; role: RoleRow } | { ok: false; error: string }> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

export async function updateRole(
  _id: string,
  _data: { name?: string; permissionLevel?: string; defaultRobot?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

export async function deleteRole(
  _id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

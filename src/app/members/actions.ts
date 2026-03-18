"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  subteam: string;
  position: string;
};

export type ImportResult = {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  errors: string[];
};

const VALID_SUBTEAMS = [
  "ASSEMBLY",
  "ELECTRICAL",
  "MANUFACTURING",
  "BUSINESS",
  "OTHER",
] as const;

const VALID_POSITIONS = [
  "MEMBER",
  "LOWER_LEADERSHIP",
  "UPPER_LEADERSHIP",
  "ADMIN",
] as const;

const SUBTEAM_LABELS: Record<string, string> = {
  assembly: "ASSEMBLY",
  electrical: "ELECTRICAL",
  manufacturing: "MANUFACTURING",
  business: "BUSINESS",
  other: "OTHER",
};

const POSITION_LABELS: Record<string, string> = {
  member: "MEMBER",
  "lower leadership": "LOWER_LEADERSHIP",
  lowleadership: "LOWER_LEADERSHIP",
  lower_leadership: "LOWER_LEADERSHIP",
  "upper leadership": "UPPER_LEADERSHIP",
  upperleadership: "UPPER_LEADERSHIP",
  upper_leadership: "UPPER_LEADERSHIP",
  admin: "ADMIN",
};

function normalizeSubteam(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return SUBTEAM_LABELS[key] ?? null;
}

function normalizePosition(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return POSITION_LABELS[key] ?? null;
}

export type CsvRow = {
  firstName: string;
  lastName: string;
  subteam: string;
  position: string;
};

export async function importMembers(rows: CsvRow[]): Promise<ImportResult> {
  await requireAdmin();

  const result: ImportResult = {
    added: 0,
    updated: 0,
    removed: 0,
    skipped: 0,
    errors: [],
  };

  // Validate and normalize incoming rows
  type ValidRow = {
    firstName: string;
    lastName: string;
    subteam: string;
    position: string;
  };

  const validRows: ValidRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowLabel = `Row ${i + 2}`; // +2 for header + 1-based

    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    if (!firstName || !lastName) {
      result.errors.push(`${rowLabel}: Missing first or last name — skipped.`);
      result.skipped++;
      continue;
    }

    const subteam = normalizeSubteam(row.subteam ?? "");
    if (!subteam) {
      result.errors.push(
        `${rowLabel} (${firstName} ${lastName}): Unknown subteam "${row.subteam}" — skipped.`,
      );
      result.skipped++;
      continue;
    }

    const position = normalizePosition(row.position ?? "");
    if (!position) {
      result.errors.push(
        `${rowLabel} (${firstName} ${lastName}): Unknown position "${row.position}" — skipped.`,
      );
      result.skipped++;
      continue;
    }

    validRows.push({ firstName, lastName, subteam, position });
  }

  // Get existing members
  const existing = await prisma.member.findMany();
  const existingMap = new Map(
    existing.map((m) => [`${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`, m]),
  );

  // Build set of incoming keys
  const incomingKeys = new Set(
    validRows.map((r) => `${r.firstName.toLowerCase()}|${r.lastName.toLowerCase()}`),
  );

  // Upsert valid rows
  for (const row of validRows) {
    const key = `${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}`;
    const existing = existingMap.get(key);

    if (!existing) {
      await prisma.member.create({
        data: {
          id: crypto.randomUUID(),
          firstName: row.firstName,
          lastName: row.lastName,
          subteam: row.subteam as (typeof VALID_SUBTEAMS)[number],
          position: row.position as (typeof VALID_POSITIONS)[number],
        },
      });
      result.added++;
    } else {
      const changed =
        existing.subteam !== row.subteam || existing.position !== row.position;
      if (changed) {
        await prisma.member.update({
          where: { id: existing.id },
          data: {
            subteam: row.subteam as (typeof VALID_SUBTEAMS)[number],
            position: row.position as (typeof VALID_POSITIONS)[number],
          },
        });
        result.updated++;
      }
    }
  }

  // Delete members not in incoming CSV
  for (const [key, member] of existingMap) {
    if (!incomingKeys.has(key)) {
      await prisma.member.delete({ where: { id: member.id } });
      result.removed++;
    }
  }

  return result;
}

export async function getMembers(): Promise<MemberRow[]> {
  await requireAdmin();
  const members = await prisma.member.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    subteam: m.subteam,
    position: m.position,
  }));
}

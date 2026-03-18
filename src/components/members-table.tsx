"use client";

import { useRef, useState, useTransition } from "react";
import { importMembers, MemberRow, CsvRow } from "@/app/members/actions";

const SUBTEAM_LABELS: Record<string, string> = {
  ASSEMBLY: "Assembly",
  ELECTRICAL: "Electrical",
  MANUFACTURING: "Manufacturing",
  BUSINESS: "Business",
  OTHER: "Other",
};

const POSITION_LABELS: Record<string, string> = {
  MEMBER: "Member",
  LOWER_LEADERSHIP: "Lower Leadership",
  UPPER_LEADERSHIP: "Upper Leadership",
  ADMIN: "Admin",
};

type ImportSummary = {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  errors: string[];
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    // Handle quoted fields
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current);

    return {
      firstName: cols[0]?.trim() ?? "",
      lastName: cols[1]?.trim() ?? "",
      subteam: cols[2]?.trim() ?? "",
      position: cols[3]?.trim() ?? "",
    };
  });
}

type Props = {
  initialMembers: MemberRow[];
};

export function MembersTable({ initialMembers }: Props) {
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setImportError("No valid rows found in CSV. Make sure it has a header row and data rows.");
        return;
      }

      setImportError(null);
      setSummary(null);

      startTransition(async () => {
        try {
          const result = await importMembers(rows);
          setSummary(result);

          // Refresh members list
          const { getMembers } = await import("@/app/members/actions");
          const updated = await getMembers();
          setMembers(updated);
        } catch {
          setImportError("Import failed. Please try again.");
        }
      });
    };
    reader.readAsText(file);

    // Reset input so same file can be re-imported
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Import Controls */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-black/60 dark:text-white/60">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="rounded-md border border-black/20 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
        >
          {isPending ? "Importing…" : "Import CSV"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Import Summary */}
      {summary && (
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          <p className="font-medium text-black dark:text-white">Import complete</p>
          <p className="mt-1 text-black/60 dark:text-white/60">
            {summary.added} added · {summary.updated} updated · {summary.removed} removed
            {summary.skipped > 0 ? ` · ${summary.skipped} skipped` : ""}
          </p>
          {summary.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {summary.errors.map((err, i) => (
                <li key={i} className="text-amber-700 dark:text-amber-400">
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Import Error */}
      {importError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {importError}
        </div>
      )}

      {/* Table */}
      {members.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-8 text-center text-sm text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
          No members yet. Import a CSV to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]">
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  First Name
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Last Name
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Subteam
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Position
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="bg-white hover:bg-black/[0.015] dark:bg-transparent dark:hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2.5 text-black dark:text-white">
                    {member.firstName}
                  </td>
                  <td className="px-4 py-2.5 text-black dark:text-white">
                    {member.lastName}
                  </td>
                  <td className="px-4 py-2.5 text-black/70 dark:text-white/70">
                    {SUBTEAM_LABELS[member.subteam] ?? member.subteam}
                  </td>
                  <td className="px-4 py-2.5 text-black/70 dark:text-white/70">
                    {POSITION_LABELS[member.position] ?? member.position}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

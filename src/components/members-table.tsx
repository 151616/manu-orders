"use client";

import { useState, useMemo, useTransition } from "react";
import {
  updateMemberProfile,
  getMembers,
  type MemberRow,
} from "@/app/members/actions";

const LEVEL_LABELS: Record<number, string> = {
  1: "Admin",
  2: "Upper Leadership",
  3: "Lower Leadership",
  4: "Member",
  5: "Pending",
};

type SortKey = "name_asc" | "name_desc" | "position_asc" | "level_asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "position_asc", label: "Position A → Z" },
  { value: "level_asc", label: "Level (highest first)" },
];

function sortMembers(members: MemberRow[], sort: SortKey): MemberRow[] {
  return [...members].sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.nickname.localeCompare(b.nickname);
      case "name_desc":
        return b.nickname.localeCompare(a.nickname);
      case "position_asc":
        return a.position.localeCompare(b.position);
      case "level_asc":
        return a.permissionLevel - b.permissionLevel;
    }
  });
}

type EditState = {
  id: string;
  nickname: string;
  position: string;
};

type Props = {
  initialMembers: MemberRow[];
};

export function MembersTable({ initialMembers }: Props) {
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowPending, startRowTransition] = useTransition();

  const displayMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) =>
            m.nickname.toLowerCase().includes(q) ||
            m.position.toLowerCase().includes(q) ||
            m.subteam.toLowerCase().includes(q) ||
            (LEVEL_LABELS[m.permissionLevel] ?? "").toLowerCase().includes(q),
        )
      : members;
    return sortMembers(filtered, sort);
  }, [members, search, sort]);

  function startEdit(member: MemberRow) {
    setEditingId(member.id);
    setEditState({
      id: member.id,
      nickname: member.nickname,
      position: member.position,
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setEditError(null);
  }

  function handleSaveEdit() {
    if (!editState) return;
    setEditError(null);
    startRowTransition(async () => {
      const result = await updateMemberProfile(editState.id, {
        nickname: editState.nickname,
        position: editState.position,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      // Refresh full list from Firestore
      const updated = await getMembers();
      setMembers(updated);
      setEditingId(null);
      setEditState(null);
    });
  }

  const inputClass =
    "w-full rounded border border-black/20 bg-white px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:ring-white/20";

  return (
    <div className="space-y-4">
      {/* Search & Sort */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-black dark:text-white">
            Search & Sort
          </span>
          <p className="text-xs text-black/50 dark:text-white/50">
            {displayMembers.length} of {members.length} user
            {members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid gap-3 border-t border-zinc-200/80 p-4 sm:grid-cols-2 dark:border-white/10">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, position, level…"
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-8 text-center text-sm text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
          No users registered yet.
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-white p-8 text-center text-sm text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
          No users match your search.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]">
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Position
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Subteam
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                  Level
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-black/60 dark:text-white/60" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {displayMembers.map((member) => {
                const isEditing = editingId === member.id;
                const cellClass = "px-4 py-2 align-middle";

                if (isEditing && editState) {
                  return (
                    <tr
                      key={member.id}
                      className="bg-black/[0.015] dark:bg-white/[0.03]"
                    >
                      <td className={cellClass}>
                        <input
                          value={editState.nickname}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              nickname: e.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          value={editState.position}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              position: e.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </td>
                      <td
                        className={`${cellClass} text-black/40 dark:text-white/40`}
                      >
                        {member.subteam || "—"}
                      </td>
                      <td
                        className={`${cellClass} text-black/40 dark:text-white/40`}
                      >
                        {LEVEL_LABELS[member.permissionLevel] ??
                          `Level ${member.permissionLevel}`}
                      </td>
                      <td className={`${cellClass} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {editError && (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              {editError}
                            </span>
                          )}
                          <button
                            onClick={handleSaveEdit}
                            disabled={rowPending}
                            className="rounded bg-black px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/85"
                          >
                            {rowPending ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={rowPending}
                            className="rounded border border-black/20 px-2.5 py-1 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={member.id}
                    className="bg-white hover:bg-black/[0.015] dark:bg-transparent dark:hover:bg-white/[0.02]"
                  >
                    <td className={`${cellClass} text-black dark:text-white`}>
                      {member.nickname}
                    </td>
                    <td
                      className={`${cellClass} text-black/70 dark:text-white/70`}
                    >
                      {member.position || "—"}
                    </td>
                    <td
                      className={`${cellClass} text-black/70 dark:text-white/70`}
                    >
                      {member.subteam || "—"}
                    </td>
                    <td className={cellClass}>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.permissionLevel === 1
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                            : member.permissionLevel === 2
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : member.permissionLevel === 3
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                                : member.permissionLevel === 4
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {LEVEL_LABELS[member.permissionLevel] ??
                          `Level ${member.permissionLevel}`}
                      </span>
                    </td>
                    <td className={`${cellClass} text-right`}>
                      <button
                        onClick={() => startEdit(member)}
                        disabled={rowPending || !!editingId}
                        className="rounded border border-black/15 px-2.5 py-1 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

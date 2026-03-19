"use client";

import { useState, useTransition } from "react";
import {
  createRole,
  updateRole,
  deleteRole,
  type RoleRow,
} from "@/app/settings/roles/actions";

const PERMISSION_LEVEL_LABELS: Record<string, string> = {
  VIEWER: "Viewer",
  LEADERSHIP: "Leadership",
  ADMIN: "Admin",
  SYSTEM_DEV: "System Developer",
};

const PERMISSION_LEVEL_OPTIONS = ["VIEWER", "LEADERSHIP", "ADMIN", "SYSTEM_DEV"] as const;
const ROBOT_OPTIONS = [
  { value: "", label: "None" },
  { value: "GAMMA", label: "Gamma" },
  { value: "LAMBDA", label: "Lambda" },
];

function PermissionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    VIEWER: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/70",
    LEADERSHIP: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    ADMIN: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    SYSTEM_DEV: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[level] ?? colors.VIEWER}`}
    >
      {PERMISSION_LEVEL_LABELS[level] ?? level}
    </span>
  );
}

type EditState = {
  id: string;
  name: string;
  permissionLevel: string;
  defaultRobot: string;
};

type NewRoleState = {
  name: string;
  permissionLevel: string;
  defaultRobot: string;
};

type Props = {
  initialRoles: RoleRow[];
};

export function RolesClient({ initialRoles }: Props) {
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newRole, setNewRole] = useState<NewRoleState>({
    name: "",
    permissionLevel: "VIEWER",
    defaultRobot: "",
  });
  const [newError, setNewError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [rowPending, startRowTransition] = useTransition();
  const [newPending, startNewTransition] = useTransition();

  function startEdit(role: RoleRow) {
    setEditingId(role.id);
    setEditState({
      id: role.id,
      name: role.name,
      permissionLevel: role.permissionLevel,
      defaultRobot: role.defaultRobot ?? "",
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
      const result = await updateRole(editState.id, {
        name: editState.name,
        permissionLevel: editState.permissionLevel,
        defaultRobot: editState.defaultRobot || null,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editState.id
            ? {
                ...r,
                name: editState.name,
                permissionLevel: editState.permissionLevel,
                defaultRobot: editState.defaultRobot || null,
              }
            : r,
        ),
      );
      setEditingId(null);
      setEditState(null);
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    startRowTransition(async () => {
      const result = await deleteRole(id);
      setDeletingId(null);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function handleCreate() {
    setNewError(null);
    startNewTransition(async () => {
      const result = await createRole(
        newRole.name,
        newRole.permissionLevel,
        newRole.defaultRobot || null,
      );
      if (!result.ok) {
        setNewError(result.error);
        return;
      }
      setRoles((prev) => [...prev, result.role].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRole({ name: "", permissionLevel: "VIEWER", defaultRobot: "" });
      setShowNewForm(false);
    });
  }

  const inputClass =
    "w-full rounded border border-black/20 bg-white px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:ring-white/20";
  const selectClass = inputClass;

  return (
    <div className="space-y-3">
      {/* Roles list */}
      <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]">
              <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                Role Name
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                Permission Level
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                Default Robot
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-black/60 dark:text-white/60">
                Members
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-black/60 dark:text-white/60" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {roles.map((role) => {
              const isEditing = editingId === role.id;
              const isDeleting = deletingId === role.id;
              const cell = "px-4 py-2 align-middle";

              if (isEditing && editState) {
                return (
                  <tr key={role.id} className="bg-black/[0.015] dark:bg-white/[0.03]">
                    <td className={cell}>
                      <input
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className={cell}>
                      <select
                        value={editState.permissionLevel}
                        onChange={(e) =>
                          setEditState({ ...editState, permissionLevel: e.target.value })
                        }
                        className={selectClass}
                      >
                        {PERMISSION_LEVEL_OPTIONS.map((l) => (
                          <option key={l} value={l}>
                            {PERMISSION_LEVEL_LABELS[l]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={cell}>
                      <select
                        value={editState.defaultRobot}
                        onChange={(e) =>
                          setEditState({ ...editState, defaultRobot: e.target.value })
                        }
                        className={selectClass}
                      >
                        {ROBOT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`${cell} text-black/50 dark:text-white/50`}>
                      {role.memberCount}
                    </td>
                    <td className={`${cell} text-right`}>
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
                  key={role.id}
                  className="bg-white hover:bg-black/[0.015] dark:bg-transparent dark:hover:bg-white/[0.02]"
                >
                  <td className={`${cell} font-medium text-black dark:text-white`}>
                    {role.name}
                    {role.isProtected && (
                      <span className="ml-1.5 text-xs text-black/30 dark:text-white/30">
                        (built-in)
                      </span>
                    )}
                  </td>
                  <td className={cell}>
                    <PermissionBadge level={role.permissionLevel} />
                  </td>
                  <td className={`${cell} text-black/60 dark:text-white/60`}>
                    {role.defaultRobot ?? "—"}
                  </td>
                  <td className={`${cell} text-black/60 dark:text-white/60`}>
                    {role.memberCount}
                  </td>
                  <td className={`${cell} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(role)}
                        disabled={rowPending || !!editingId}
                        className="rounded border border-black/15 px-2.5 py-1 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                      >
                        Edit
                      </button>
                      {!role.isProtected && (
                        <button
                          onClick={() => handleDelete(role.id)}
                          disabled={isDeleting || rowPending || !!editingId}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {deleteError}
        </div>
      )}

      {/* Add role */}
      {showNewForm ? (
        <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <p className="mb-3 text-sm font-semibold text-black dark:text-white">New Role</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                Name
              </label>
              <input
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="e.g. Electrical Lead"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                Permission Level
              </label>
              <select
                value={newRole.permissionLevel}
                onChange={(e) => setNewRole({ ...newRole, permissionLevel: e.target.value })}
                className={selectClass}
              >
                {PERMISSION_LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {PERMISSION_LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                Default Robot
              </label>
              <select
                value={newRole.defaultRobot}
                onChange={(e) => setNewRole({ ...newRole, defaultRobot: e.target.value })}
                className={selectClass}
              >
                {ROBOT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {newError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{newError}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={newPending}
              className="rounded bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              {newPending ? "Creating…" : "Create Role"}
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewError(null);
              }}
              disabled={newPending}
              className="rounded border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full rounded-lg border border-dashed border-black/20 py-2 text-sm font-medium text-black/50 hover:border-black/40 hover:text-black/70 dark:border-white/20 dark:text-white/50 dark:hover:border-white/40 dark:hover:text-white/70"
        >
          + Add Role
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { changeViewerCode, changeAdminCode } from "@/app/settings/actions";

type FormState = "idle" | "success" | "error";

function CodeChangeForm({
  label,
  description,
  currentLabel,
  onSubmit,
}: {
  label: string;
  description: string;
  currentLabel: string;
  onSubmit: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setState("idle");
    setErrorMsg("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setState("error");
      setErrorMsg("New codes do not match.");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(current, next);
      if (result.ok) {
        setState("success");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setState("error");
        setErrorMsg(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-sm font-semibold text-black dark:text-white">{label}</h3>
      <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">{description}</p>

      {state === "success" ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 dark:border-green-500/20 dark:bg-green-900/10">
          <p className="text-sm text-green-700 dark:text-green-400">Code updated successfully.</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-green-700/70 underline dark:text-green-400/70"
          >
            Change again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              {currentLabel}
            </label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:ring-white/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              New Code
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:ring-white/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Confirm New Code
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:ring-white/20"
            />
          </div>

          {state === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-black bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-black/85 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/85"
          >
            {pending ? "Saving…" : "Update Code"}
          </button>
        </form>
      )}
    </div>
  );
}

export function ChangeCodeSettings() {
  return (
    <div className="space-y-3">
      <CodeChangeForm
        label="Viewer Access Code"
        description="Anyone with this code can log in as a viewer. Requires the current admin code (or system operator code) to change."
        currentLabel="Current Admin Code"
        onSubmit={changeViewerCode}
      />

      <CodeChangeForm
        label="Admin Access Code"
        description="Requires the system operator code to change."
        currentLabel="System Operator Code"
        onSubmit={changeAdminCode}
      />
    </div>
  );
}

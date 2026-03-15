"use client";

import { useState } from "react";

type ActivityDiff = {
  field: string;
  from: string;
  to: string;
};

type SerializedActivity = {
  id: string;
  at: string;
  role: string;
  details: {
    summary: string;
    diffs: ActivityDiff[];
  };
};

export function ActivityDropdown({
  activities,
}: {
  activities: SerializedActivity[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02] sm:px-6 dark:hover:bg-white/[0.03]"
      >
        <span className="text-lg font-semibold text-black dark:text-white">
          Activity
          {activities.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-black/40 dark:text-white/40">
              {activities.length} event{activities.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </span>
        <span
          className="text-lg font-light leading-none text-black/40 transition-transform duration-200 dark:text-white/40"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 px-4 pb-4 pt-3 sm:px-6 dark:border-white/10">
            {activities.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-white/60">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {new Date(activity.at).toLocaleString()} by {activity.role}
                    </p>
                    <p className="mt-1 text-sm font-medium text-black dark:text-white">
                      {activity.details.summary}
                    </p>
                    {activity.details.diffs.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {activity.details.diffs.map((diff, index) => (
                          <p
                            key={`${activity.id}-${diff.field}-${index}`}
                            className="text-xs text-black/60 dark:text-white/60"
                          >
                            {diff.field}: {diff.from} → {diff.to}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

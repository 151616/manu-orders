"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mq:admin:lastKnownPendingCount";

type Props = { pendingCount: number };

export function PendingRequestsToast({ pendingCount }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const lastKnown = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    // Always update stored count so future visits compare against current
    localStorage.setItem(STORAGE_KEY, String(pendingCount));

    if (pendingCount > lastKnown) {
      const diff = pendingCount - lastKnown;
      setMessage(`${diff} new request${diff === 1 ? "" : "s"} pending`);
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!message) return null;

  return (
    <div className="fixed right-3 top-3 z-50 max-w-xs rounded-xl border border-indigo-200 bg-white px-4 py-3 shadow-lg dark:border-indigo-500/30 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/requests"
          className="text-sm font-medium text-indigo-900 hover:underline dark:text-indigo-200"
          onClick={() => setMessage(null)}
        >
          🔔 {message}
        </Link>
        <button
          onClick={() => setMessage(null)}
          className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

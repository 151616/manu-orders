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
    <div className="fixed right-3 top-3 z-50 max-w-xs overflow-hidden rounded-xl border border-black/15 bg-white shadow-lg dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/requests"
          className="text-sm font-medium text-black hover:underline dark:text-white"
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
      <div className="h-0.5 bg-black/8 dark:bg-white/10">
        <div
          className="h-full origin-left bg-black dark:bg-white"
          style={{ animation: "toast-drain 5s linear forwards" }}
        />
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export function PendingClient({ userName }: { userName: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white/85 p-6 text-center shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold text-black dark:text-white">
          Request Pending
        </h2>

        <p className="mt-2 text-sm text-black/65 dark:text-white/65">
          Hi {userName}! Your account has been submitted and is awaiting
          approval. An administrator will review your information shortly.
        </p>

        <p className="mt-4 text-xs text-black/40 dark:text-white/40">
          You&apos;ll be able to access the full app once approved.
        </p>

        <button
          onClick={handleLogout}
          className="mt-6 rounded-md border border-zinc-300 px-4 py-2 text-sm text-black/70 hover:bg-zinc-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/5"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

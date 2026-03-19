"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MemberOption = { id: string; name: string };

type LoginApiResponse = {
  error?: string;
  redirectTo?: string;
};

const LOGIN_TIMEOUT_MS = 15000;

export function LoginForm() {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  // Fetch member list on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/members");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      } catch {
        // silently fail — list will be empty
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedUserId(e.target.value);
    setErrorMessage(null);
    // Auto-focus PIN input when a name is selected
    if (e.target.value) {
      setTimeout(() => pinRef.current?.focus(), 50);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending || isRedirecting) return;
    setErrorMessage(null);

    if (!selectedUserId) {
      setErrorMessage("Please select your name.");
      return;
    }

    setIsPending(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        LOGIN_TIMEOUT_MS,
      );

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, pin }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      let data: LoginApiResponse | null = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        setErrorMessage(
          data?.error ?? "Unable to complete login. Please try again.",
        );
        setPin("");
        return;
      }

      setIsRedirecting(true);
      window.setTimeout(() => {
        window.location.assign(data?.redirectTo ?? "/queue");
      }, 80);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage("Login timed out. Please try again.");
      } else {
        setErrorMessage("Unable to complete login. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  }

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-zinc-200 border-t-black dark:border-white/20 dark:border-t-white" />
        <p className="text-base font-semibold text-black dark:text-white">
          Verification accepted
        </p>
        <p className="text-sm text-black/65 dark:text-white/65">
          Loading your workspace…
        </p>
      </div>
    );
  }

  const selectClass =
    "w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10";

  const inputClass =
    "w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black text-center tracking-[0.3em] font-mono outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-900"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          Login
        </h2>
        <p className="mt-1 text-sm text-black/65 dark:text-white/65">
          Select your name and enter your PIN.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          Name
        </span>
        <select
          value={selectedUserId}
          onChange={handleNameChange}
          disabled={isPending || loadingMembers}
          className={selectClass}
        >
          <option value="">
            {loadingMembers ? "Loading members…" : "Select your name"}
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          PIN
        </span>
        <input
          ref={pinRef}
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
            setPin(val);
          }}
          autoComplete="off"
          required
          disabled={isPending || !selectedUserId}
          placeholder="••••"
          className={inputClass}
        />
      </label>

      {errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !selectedUserId || pin.length !== 4}
        className="w-full rounded-md bg-black px-3 py-2.5 text-sm font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>

      <div className="pt-2 text-center">
        <Link
          href="/register"
          className="text-sm text-black/60 underline hover:text-black dark:text-white/60 dark:hover:text-white"
        >
          Create New Account
        </Link>
      </div>
    </form>
  );
}

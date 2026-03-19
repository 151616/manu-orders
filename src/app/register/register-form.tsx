"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerUser, type RegisterResult } from "@/app/register/actions";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RegisterResult | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerUser(formData);
      setResult(res);
    });
  }

  // ── Success screen ──────────────────────────────────────────────────
  if (result?.success) {
    return (
      <div className="w-full space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-black dark:text-white">
            Information Submitted
          </h2>
          <p className="text-sm text-black/65 dark:text-white/65">
            Thank you for submitting your information. Your account is pending
            approval. You&apos;ll be able to log in once an administrator
            reviews your application.
          </p>
          <Link
            href="/login"
            className="mt-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────
  const inputClass =
    "w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-900"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          Create Account
        </h2>
        <p className="mt-1 text-sm text-black/65 dark:text-white/65">
          Fill out your information to request access.
        </p>
      </div>

      {/* First Name */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          First Name
        </span>
        <input
          type="text"
          name="firstName"
          required
          disabled={isPending}
          placeholder="John"
          autoComplete="given-name"
          className={inputClass}
        />
      </label>

      {/* Last Name */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          Last Name
        </span>
        <input
          type="text"
          name="lastName"
          required
          disabled={isPending}
          placeholder="Doe"
          autoComplete="family-name"
          className={inputClass}
        />
      </label>

      {/* PIN */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          4-Digit PIN
        </span>
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          disabled={isPending}
          placeholder="••••"
          autoComplete="off"
          className={`${inputClass} text-center font-mono tracking-[0.3em]`}
        />
        <p className="text-xs text-black/50 dark:text-white/50">
          Choose a memorable 4-digit number. This is your login PIN.
        </p>
      </label>

      {/* Position */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          Position
        </span>
        <input
          type="text"
          name="position"
          required
          disabled={isPending}
          placeholder="e.g. Electrical Team Member, Drive Team Lead…"
          autoComplete="off"
          className={inputClass}
        />
      </label>

      {/* Subteam (optional) */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">
          Subteam{" "}
          <span className="font-normal text-black/50 dark:text-white/50">
            (optional)
          </span>
        </span>
        <input
          type="text"
          name="subteam"
          disabled={isPending}
          placeholder="e.g. Assembly, Electrical, CAD, Programming…"
          autoComplete="off"
          className={inputClass}
        />
      </label>

      {/* Error */}
      {result?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {result.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black px-3 py-2.5 text-sm font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
      >
        {isPending ? "Submitting…" : "Submit My Information"}
      </button>

      <div className="pt-1 text-center">
        <Link
          href="/login"
          className="text-sm text-black/60 underline hover:text-black dark:text-white/60 dark:hover:text-white"
        >
          Already have an account? Login
        </Link>
      </div>
    </form>
  );
}

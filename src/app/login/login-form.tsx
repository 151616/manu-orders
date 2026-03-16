"use client";

import { useEffect, useRef, useState } from "react";

type LoginApiResponse = {
  error?: string;
  redirectTo?: string;
};

const LOGIN_REQUEST_TIMEOUT_MS = 15000;

function logLoginDebug(event: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (details) {
    console.info(`[ManuQueue Login Debug] ${timestamp} ${event}`, details);
    return;
  }
  console.info(`[ManuQueue Login Debug] ${timestamp} ${event}`);
}

export function LoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isVerifiedLoading, setIsVerifiedLoading] = useState(false);
  const submitRef = useRef<{
    startedAt: number;
    requestId: string;
  } | null>(null);

  useEffect(() => {
    logLoginDebug("ready", {
      hint:
        "If login hangs, copy logs starting with [ManuQueue Login Debug] and share them.",
    });
  }, []);

  useEffect(() => {
    if (!isPending) {
      if (submitRef.current) {
        const elapsedMs = Math.round(performance.now() - submitRef.current.startedAt);
        logLoginDebug("request-finished", {
          requestId: submitRef.current.requestId,
          elapsedMs,
          error: errorMessage,
        });
      }
      return;
    }

    const pendingMeta = submitRef.current;
    if (!pendingMeta) {
      logLoginDebug("request-pending-without-submit-meta");
      return;
    }

    logLoginDebug("request-pending", { requestId: pendingMeta.requestId });

    const timeoutId = window.setTimeout(() => {
      const elapsedMs = Math.round(performance.now() - pendingMeta.startedAt);
      logLoginDebug("request-still-pending", {
        requestId: pendingMeta.requestId,
        elapsedMs,
        online: navigator.onLine,
      });
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPending, errorMessage]);

  useEffect(() => {
    if (errorMessage) {
      logLoginDebug("request-error", { error: errorMessage });
    }
  }, [errorMessage]);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (isPending || isVerifiedLoading) return;

        const formData = new FormData(event.currentTarget);
        const code = typeof formData.get("code") === "string"
          ? (formData.get("code") as string)
          : "";
        const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        submitRef.current = { startedAt: performance.now(), requestId };

        logLoginDebug("submit", {
          requestId,
          codeLength: code.length,
          online: navigator.onLine,
          path: window.location.pathname,
        });

        setErrorMessage(null);
        setIsPending(true);

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
          controller.abort("login-timeout");
        }, LOGIN_REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code }),
            signal: controller.signal,
          });

          let payload: LoginApiResponse | null = null;
          try {
            payload = (await response.json()) as LoginApiResponse;
          } catch {
            payload = null;
          }

          if (!response.ok) {
            setErrorMessage(
              payload?.error ?? "Unable to complete login right now. Please try again.",
            );
            return;
          }

          const redirectTo = payload?.redirectTo ?? "/queue";
          logLoginDebug("request-success", { requestId, redirectTo });
          setIsVerifiedLoading(true);
          logLoginDebug("request-verified-loading", { requestId, redirectTo });
          window.setTimeout(() => {
            window.location.assign(redirectTo);
          }, 80);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setErrorMessage("Login timed out. Please try again.");
          } else {
            setErrorMessage("Unable to complete login right now. Please try again.");
          }
        } finally {
          window.clearTimeout(timeoutId);
          setIsPending(false);
        }
      }}
      className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-900"
    >
      {isVerifiedLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-6 dark:bg-zinc-900/95">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-lg dark:border-white/10 dark:bg-zinc-800">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-zinc-200 border-t-black dark:border-white/20 dark:border-t-white" />
            <p className="mt-4 text-base font-semibold text-black dark:text-white">
              Verification accepted
            </p>
            <p className="mt-1 text-sm text-black/65 dark:text-white/65">
              Loading your workspace...
            </p>
          </div>
        </div>
      ) : null}

      <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">Login</h2>
      <p className="text-sm text-black/65 dark:text-white/65">
        Enter your access code to continue.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black dark:text-white">Access Code</span>
        <input
          type="password"
          name="code"
          autoComplete="off"
          autoFocus
          required
          className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/55 dark:focus:border-white/40 dark:focus:ring-white/10"
          placeholder="Enter access code"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || isVerifiedLoading}
        className="w-full rounded-md bg-black px-3 py-2.5 text-sm font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/85"
      >
        {isVerifiedLoading
          ? "Loading workspace..."
          : isPending
            ? "Signing in..."
            : "Sign In"}
      </button>
    </form>
  );
}

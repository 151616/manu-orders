"use client";

import { useActionState } from "react";
import {
  elevateAction,
  ElevateActionState,
} from "@/app/elevate/actions";

const initialState: ElevateActionState = {
  error: null,
};

export function ElevateForm() {
  const [state, formAction, isPending] = useActionState<
    ElevateActionState,
    FormData
  >(elevateAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-2xl font-bold tracking-tight text-black">Elevate to Admin</h2>
      <p className="text-sm text-black/65">
        Enter the shared codes to upgrade this session to ADMIN.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Team Access Code</span>
        <input
          type="password"
          name="accessCode"
          autoComplete="off"
          required
          className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter shared code"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Admin Code</span>
        <input
          type="password"
          name="adminCode"
          autoComplete="off"
          required
          className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          placeholder="Enter admin code"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black px-3 py-2.5 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Elevating..." : "Elevate Session"}
      </button>
    </form>
  );
}

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
      className="w-full max-w-md space-y-4 rounded-lg border border-black/10 bg-white p-6 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-black">Elevate to Admin</h1>
      <p className="text-sm text-black/70">
        Enter the shared codes to upgrade this session to ADMIN.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Team Access Code</span>
        <input
          type="password"
          name="accessCode"
          autoComplete="off"
          required
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
          placeholder="Enter admin code"
        />
      </label>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Elevating..." : "Elevate Session"}
      </button>
    </form>
  );
}

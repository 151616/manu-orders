"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

type LoginActionState = {
  error: string | null;
};

const initialLoginState: LoginActionState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<
    LoginActionState,
    FormData
  >(loginAction, initialLoginState);

  return (
    <form
      action={formAction}
      className="w-full max-w-md space-y-4 rounded-lg border border-black/10 bg-white p-6 shadow-sm"
    >
      <h1 className="text-2xl font-semibold text-black">Login</h1>
      <p className="text-sm text-black/70">
        Enter the shared team access code to continue.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Role</span>
        <select
          name="role"
          defaultValue="REQUESTER"
          className="w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
        >
          <option value="REQUESTER">REQUESTER</option>
          <option value="MANUFACTURING">MANUFACTURING</option>
        </select>
      </label>

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
        <span className="text-sm font-medium text-black">
          Manufacturing Code (only when role is MANUFACTURING)
        </span>
        <input
          type="password"
          name="manufacturingCode"
          autoComplete="off"
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
          placeholder="Optional for requester login"
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
        {isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

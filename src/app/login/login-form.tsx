"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

type LoginActionState = {
  error: string | null;
};

const initialLoginState: LoginActionState = {
  error: null,
};

export function LoginForm() {
  const [selectedRole, setSelectedRole] = useState<"VIEWER" | "ADMIN">(
    "VIEWER",
  );
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
        Choose a role and enter the matching role code.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Role</span>
        <select
          name="role"
          value={selectedRole}
          onChange={(event) =>
            setSelectedRole(event.target.value as "VIEWER" | "ADMIN")
          }
          className="w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
        >
          <option value="VIEWER">VIEWER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">
          {selectedRole === "VIEWER" ? "Viewer Code" : "Admin Code"}
        </span>
        <input
          key={selectedRole}
          type="password"
          name="roleCode"
          autoComplete="off"
          required
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
          placeholder={
            selectedRole === "VIEWER"
              ? "Enter viewer code"
              : "Enter admin code"
          }
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

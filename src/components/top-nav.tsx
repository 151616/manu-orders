import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { AuthUser } from "@/lib/auth";

type TopNavProps = {
  user: Pick<AuthUser, "name" | "role">;
};

export function TopNav({ user }: TopNavProps) {
  const canMutate = user.role === "ADMIN";

  return (
    <header className="border-b border-black/10 bg-white">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/queue" className="text-sm font-semibold text-black">
            ManuQueue
          </Link>
          <Link href="/queue" className="text-sm text-black/80 hover:text-black">
            Queue
          </Link>
          {canMutate ? (
            <Link
              href="/orders/new"
              className="text-sm text-black/80 hover:text-black"
            >
              New Order
            </Link>
          ) : null}
          {canMutate ? (
            <Link
              href="/trash"
              className="text-sm text-black/80 hover:text-black"
            >
              Trash
            </Link>
          ) : null}
          <Link
            href="/bookmarks"
            className="text-sm text-black/80 hover:text-black"
          >
            Bookmarks
          </Link>
          {!canMutate ? (
            <Link
              href="/elevate"
              className="text-sm text-black/80 hover:text-black"
            >
              Elevate
            </Link>
          ) : null}
          {canMutate ? (
            <Link
              href="/users"
              className="text-sm text-black/80 hover:text-black"
            >
              Users
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-black/60">
            {user.name} ({user.role})
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded border border-black/20 px-3 py-1 text-xs font-medium text-black hover:bg-black/5"
            >
              Logout
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { AuthUser } from "@/lib/auth";

type TopNavProps = {
  user: Pick<AuthUser, "name" | "role">;
};

type NavItem = {
  href: string;
  label: string;
};

function isPathActive(pathname: string, href: string) {
  if (href === "/queue") {
    return pathname === "/queue" || pathname.startsWith("/orders/");
  }

  if (href === "/orders/new") {
    return pathname === "/orders/new";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  pathname,
}: NavItem & {
  pathname: string;
}) {
  const active = isPathActive(pathname, href);

  return (
    <Link
      href={href}
      className={
        active
          ? "whitespace-nowrap rounded-full border border-black bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm"
          : "whitespace-nowrap rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black/80 hover:border-black/25 hover:bg-black/5 hover:text-black"
      }
    >
      {label}
    </Link>
  );
}

export function TopNav({ user }: TopNavProps) {
  const pathname = usePathname();
  const canMutate = user.role === "ADMIN";

  const navItems: NavItem[] = [
    { href: "/queue", label: "Queue" },
    ...(canMutate ? [{ href: "/orders/new", label: "New Order" }] : []),
    { href: "/bookmarks", label: "Bookmarks" },
    ...(canMutate ? [{ href: "/trash", label: "Trash" }] : []),
    ...(!canMutate ? [{ href: "/elevate", label: "Elevate" }] : []),
    ...(canMutate ? [{ href: "/users", label: "Users" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-md">
      <nav className="mx-auto w-full max-w-5xl px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/queue" className="text-base font-bold tracking-tight text-black">
            ManuQueue
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-black/70 sm:hidden">
              {user.role}
            </span>
            <span className="hidden text-xs text-black/60 sm:inline">
              {user.name} ({user.role})
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-black/20 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              pathname={pathname}
            />
          ))}
        </div>

        <p className="mt-2 text-xs text-black/60 sm:hidden">{user.name}</p>
      </nav>
    </header>
  );
}

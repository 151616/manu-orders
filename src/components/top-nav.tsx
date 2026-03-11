"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { AuthUser } from "@/lib/auth";

type TopNavProps = {
  user: Pick<AuthUser, "name" | "role">;
  siteBookmarks: Array<{
    id: string;
    name: string;
  }>;
};

type NavItem = {
  href: string;
  label: string;
};

const MAX_VISIBLE_SITE_BOOKMARKS = 4;

function isPathActive(pathname: string, href: string) {
  if (href === "/queue") {
    return (
      pathname === "/queue" ||
      (pathname.startsWith("/orders/") && pathname !== "/orders/new")
    );
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

export function TopNav({ user, siteBookmarks }: TopNavProps) {
  const pathname = usePathname();
  const canMutate = user.role === "ADMIN";
  const visibleSiteBookmarks = siteBookmarks.slice(0, MAX_VISIBLE_SITE_BOOKMARKS);
  const overflowSiteBookmarks = siteBookmarks.slice(MAX_VISIBLE_SITE_BOOKMARKS);

  const navItems: NavItem[] = [
    { href: "/queue", label: "Queue" },
    ...(canMutate ? [{ href: "/orders/new", label: "New Order" }] : []),
    { href: "/bookmarks", label: "Bookmarks" },
    { href: "/tracking", label: "Tracking" },
    ...(canMutate ? [{ href: "/trash", label: "Trash" }] : []),
    ...(!canMutate ? [{ href: "/elevate", label: "Elevate" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-md">
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              pathname={pathname}
            />
          ))}

          {siteBookmarks.length > 0 ? (
            <span
              aria-hidden="true"
              className="mx-1 hidden h-5 w-px bg-black/15 sm:inline-block"
            />
          ) : null}

          {visibleSiteBookmarks.map((bookmark) => (
            <Link
              key={bookmark.id}
              href={`/orders/new?siteBookmarkId=${bookmark.id}`}
              className="whitespace-nowrap rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900 hover:border-sky-400 hover:bg-sky-100"
            >
              {bookmark.name}
            </Link>
          ))}

          {overflowSiteBookmarks.length > 0 ? (
            <details className="relative">
              <summary className="cursor-pointer list-none whitespace-nowrap rounded-full border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-900 hover:border-sky-400 hover:bg-sky-50">
                More Sites
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {overflowSiteBookmarks.map((bookmark) => (
                  <Link
                    key={bookmark.id}
                    href={`/orders/new?siteBookmarkId=${bookmark.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-black/85 hover:bg-sky-50 hover:text-black"
                  >
                    {bookmark.name}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-black/60 sm:hidden">{user.name}</p>
      </nav>
    </header>
  );
}

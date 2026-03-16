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
    siteUrl: string | null;
  }>;
  pendingRequestCount?: number;
};

type NavItem = {
  href: string;
  label: string;
};

const MAX_VISIBLE_SITE_BOOKMARKS = 4;

function toExternalUrl(url: string | null | undefined): string {
  if (!url) return "#";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

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
          ? "whitespace-nowrap rounded-full border border-black bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
          : "whitespace-nowrap rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black/80 hover:border-black/25 hover:bg-black/5 hover:text-black dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white"
      }
    >
      {label}
    </Link>
  );
}

export function TopNav({ user, siteBookmarks, pendingRequestCount = 0 }: TopNavProps) {
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
    {
      href: "/requests",
      label:
        canMutate && pendingRequestCount > 0
          ? `Requests (${pendingRequestCount})`
          : "Requests",
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
      <nav className="mx-auto w-full max-w-5xl px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/queue" className="text-base font-bold tracking-tight text-black dark:text-white">
            ManuQueue
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-black/70 sm:hidden dark:bg-slate-800 dark:text-white/70">
              {user.role}
            </span>
            <span className="hidden text-xs text-black/60 sm:inline dark:text-white/60">
              {user.name} ({user.role})
            </span>
            <Link
              href="/settings"
              aria-label="Settings"
              className={`rounded-md border p-1.5 ${
                isPathActive(pathname, "/settings")
                  ? "border-black/30 bg-black/10 text-black dark:border-white/30 dark:bg-white/10 dark:text-white"
                  : "border-black/20 bg-white text-black/60 hover:bg-black/5 hover:text-black dark:border-white/20 dark:bg-transparent dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-black/20 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="hide-scrollbar mt-2 flex items-center gap-2 overflow-x-auto pb-0.5">
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
              className="mx-1 hidden h-5 w-px bg-black/15 sm:inline-block dark:bg-white/15"
            />
          ) : null}

          {visibleSiteBookmarks.map((bookmark) => (
            <a
              key={bookmark.id}
              href={toExternalUrl(bookmark.siteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black/80 hover:border-black/25 hover:bg-black/5 hover:text-black dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {bookmark.name}
            </a>
          ))}

          {overflowSiteBookmarks.length > 0 ? (
            <details className="relative">
              <summary className="cursor-pointer list-none whitespace-nowrap rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black/80 hover:border-black/25 hover:bg-black/5 hover:text-black dark:border-white/15 dark:bg-transparent dark:text-white/80 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white">
                More Sites
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {overflowSiteBookmarks.map((bookmark) => (
                  <a
                    key={bookmark.id}
                    href={toExternalUrl(bookmark.siteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-md px-2 py-1.5 text-sm text-black/85 hover:bg-black/5 hover:text-black dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {bookmark.name}
                  </a>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-black/60 sm:hidden dark:text-white/60">{user.name}</p>
      </nav>
    </header>
  );
}

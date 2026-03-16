"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NAVIGATION_TIMEOUT_MS = 15000;

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) {
    return false;
  }

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") {
    return false;
  }

  const hrefAttribute = anchor.getAttribute("href");
  if (!hrefAttribute || hrefAttribute.startsWith("#")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) {
    return false;
  }

  const current = `${window.location.pathname}${window.location.search}`;
  const next = `${nextUrl.pathname}${nextUrl.search}`;
  return current !== next;
}

export function PageTransitionOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingFromRouteKey, setPendingFromRouteKey] = useState<string | null>(null);

  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const isLoading =
    pendingFromRouteKey !== null && pendingFromRouteKey === routeKey;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (isInternalNavigation(anchor)) {
        setPendingFromRouteKey(routeKey);
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [routeKey]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingFromRouteKey(null);
    }, NAVIGATION_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/92 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-lg">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-zinc-200 border-t-black" />
        <p className="mt-4 text-base font-semibold text-black">Loading page...</p>
        <p className="mt-1 text-sm text-black/65">
          Please wait while we open the next screen.
        </p>
      </div>
    </div>
  );
}

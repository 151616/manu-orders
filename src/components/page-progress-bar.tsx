"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNav(anchor: HTMLAnchorElement): boolean {
  if (anchor.hasAttribute("download")) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  try {
    const next = new URL(anchor.href, window.location.href);
    if (next.origin !== window.location.origin) return false;
    const cur = window.location.pathname + window.location.search;
    return cur !== next.pathname + next.search;
  } catch {
    return false;
  }
}

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");
  const navFromRef = useRef<string | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRoute = pathname + searchParams.toString();

  // Route changed → navigation finished
  useEffect(() => {
    if (
      phase === "active" &&
      navFromRef.current !== null &&
      navFromRef.current !== currentRoute
    ) {
      navFromRef.current = null;
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
      setPhase("done");
    }
  }, [currentRoute, phase]);

  // Safety valve: clear bar after 12s even if route never changes
  useEffect(() => {
    if (phase !== "active") return;
    stuckTimerRef.current = setTimeout(() => {
      navFromRef.current = null;
      setPhase("done");
    }, 12000);
    return () => {
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    };
  }, [phase]);

  // Fade out, then unmount
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 350);
    return () => clearTimeout(t);
  }, [phase]);

  // Listen for internal link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const a = e.target.closest("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (isInternalNav(a)) {
        navFromRef.current = currentRoute;
        setPhase("active");
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [currentRoute]);

  if (phase === "idle") return null;

  return (
    <>
      <style>{`
        @keyframes pbar-grow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(0.85); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden"
      >
        <div
          className="h-full w-full bg-black"
          style={
            phase === "active"
              ? {
                  transformOrigin: "left center",
                  animation:
                    "pbar-grow 10s cubic-bezier(0.05, 0.5, 0.1, 0.95) forwards",
                }
              : {
                  transformOrigin: "left center",
                  opacity: 0,
                  transition: "opacity 0.3s ease",
                }
          }
        />
      </div>
    </>
  );
}

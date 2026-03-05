"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type QueueRuntimeProps = {
  monitor: boolean;
};

export function QueueRuntime({ monitor }: QueueRuntimeProps) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const body = document.body;

    if (monitor) {
      body.dataset.monitorMode = "1";
    } else {
      delete body.dataset.monitorMode;
    }

    return () => {
      delete body.dataset.monitorMode;
    };
  }, [monitor]);

  useEffect(() => {
    const refresh = () => {
      const y = window.scrollY;
      router.refresh();
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "auto" });
      });
    };

    const interval = window.setInterval(refresh, 15000);
    return () => window.clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore browser fullscreen permission errors.
    }
  }

  if (!monitor) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
    >
      {isFullscreen ? "Exit Full Screen" : "Full Screen"}
    </button>
  );
}

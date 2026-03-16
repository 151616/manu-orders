"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "debug";

type ToastBannerProps = {
  tone: ToastTone;
  message: string;
};

const toastToneClass: Record<ToastTone, string> = {
  success: "border-black/15 bg-black/5 text-black dark:border-white/15 dark:bg-white/5 dark:text-white",
  debug: "border-black/15 bg-black/5 text-black dark:border-white/15 dark:bg-white/5 dark:text-white",
};

export function ToastBanner({ tone, message }: ToastBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 sm:inset-auto sm:top-4 sm:right-4">
      <div
        className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${toastToneClass[tone]}`}
      >
        {message}
      </div>
    </div>
  );
}

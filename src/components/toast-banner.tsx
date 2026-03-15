"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "debug";

type ToastBannerProps = {
  tone: ToastTone;
  message: string;
};

const toastToneClass: Record<ToastTone, string> = {
  success: "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  debug: "border-sky-300 bg-sky-50/95 text-sky-900 dark:border-sky-500/40 dark:bg-sky-900/30 dark:text-sky-200",
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

"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "debug";

type ToastBannerProps = {
  tone: ToastTone;
  message: string;
};

const toastToneClass: Record<ToastTone, string> = {
  success: "border-emerald-300 bg-emerald-50/95 text-emerald-900",
  debug: "border-sky-300 bg-sky-50/95 text-sky-900",
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

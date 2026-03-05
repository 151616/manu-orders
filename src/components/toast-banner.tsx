"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "debug";

type ToastBannerProps = {
  tone: ToastTone;
  message: string;
};

const toastToneClass: Record<ToastTone, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  debug: "border-sky-300 bg-sky-50 text-sky-900",
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
    <div className="pointer-events-none fixed top-4 right-4 z-50">
      <div
        className={`pointer-events-auto rounded-md border px-4 py-3 text-sm shadow ${toastToneClass[tone]}`}
      >
        {message}
      </div>
    </div>
  );
}

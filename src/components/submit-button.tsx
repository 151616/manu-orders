"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel?: string;
  className?: string;
};

export function SubmitButton({
  idleLabel,
  pendingLabel = "Saving...",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-white/85"
      }
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

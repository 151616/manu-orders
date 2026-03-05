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
        "rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

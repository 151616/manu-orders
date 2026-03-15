"use client";

import { useState } from "react";

type PriorityStarsInputProps = {
  name: string;
  defaultValue: number;
};

const FILLED_STAR = String.fromCharCode(9733);
const EMPTY_STAR = String.fromCharCode(9734);

export function PriorityStarsInput({ name, defaultValue }: PriorityStarsInputProps) {
  const [value, setValue] = useState(Math.max(1, Math.min(5, defaultValue)));

  return (
    <div className="space-y-1">
      <input type="hidden" name={name} value={value} />
      <div className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
        {Array.from({ length: 5 }, (_, index) => {
          const current = index + 1;
          const isFilled = current <= value;
          return (
            <button
              key={current}
              type="button"
              onClick={() => setValue(current)}
              className={
                isFilled
                  ? "rounded-md px-1 py-0.5 text-2xl leading-none text-amber-500 transition hover:scale-110"
                  : "rounded-md px-1 py-0.5 text-2xl leading-none text-slate-300 transition hover:scale-110 hover:text-amber-400 dark:text-white/25"
              }
              aria-label={`Set priority to ${current}`}
            >
              {isFilled ? FILLED_STAR : EMPTY_STAR}
            </button>
          );
        })}
      </div>
    </div>
  );
}

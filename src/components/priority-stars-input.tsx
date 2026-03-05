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
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const current = index + 1;
          const isFilled = current <= value;
          return (
            <button
              key={current}
              type="button"
              onClick={() => setValue(current)}
              className="text-xl text-amber-500 transition hover:scale-110"
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

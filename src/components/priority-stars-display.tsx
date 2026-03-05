type PriorityStarsDisplayProps = {
  value: number;
  className?: string;
};

const FILLED_STAR = String.fromCharCode(9733);
const EMPTY_STAR = String.fromCharCode(9734);

export function PriorityStarsDisplay({
  value,
  className,
}: PriorityStarsDisplayProps) {
  const safeValue = Math.max(1, Math.min(5, value));

  return (
    <span className={className ?? "text-sm text-amber-500"} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) =>
        index < safeValue ? FILLED_STAR : EMPTY_STAR,
      ).join("")}
    </span>
  );
}

import { ROBOT_LABELS, type Robot } from "@/lib/order-domain";

const robotClassMap: Record<Robot, string> = {
  LAMBDA: "bg-zinc-900 text-white ring-zinc-700 dark:bg-white dark:text-black dark:ring-white/60",
  GAMMA:  "bg-zinc-900 text-white ring-zinc-700 dark:bg-white dark:text-black dark:ring-white/60",
};

type RobotBadgeProps = {
  robot: string | null | undefined;
};

export function RobotBadge({ robot }: RobotBadgeProps) {
  if (!robot) return null;
  const r = robot as Robot;
  const className =
    robotClassMap[r] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-white/10 dark:text-white/60 dark:ring-white/15";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${className}`}
    >
      {ROBOT_LABELS[r] ?? robot}
    </span>
  );
}

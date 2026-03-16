import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-domain";

const statusClassMap: Record<OrderStatus, string> = {
  NEW: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-white/60 dark:ring-white/15",
  QUEUED: "bg-slate-900 text-white ring-slate-700 dark:bg-white dark:text-black dark:ring-white/60",
  IN_PROGRESS: "bg-slate-600 text-white ring-slate-500 dark:bg-white/70 dark:text-black dark:ring-white/40",
  WAITING_ON_PARTS: "bg-slate-300 text-slate-800 ring-slate-400 dark:bg-white/25 dark:text-white dark:ring-white/20",
  DONE: "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-white/15 dark:text-white/70 dark:ring-white/15",
  BLOCKED: "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-500/30",
  CANCELLED: "bg-zinc-100 text-zinc-500 ring-zinc-200 dark:bg-white/5 dark:text-white/40 dark:ring-white/10",
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status as OrderStatus;
  const className =
    statusClassMap[normalizedStatus] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  const label = ORDER_STATUS_LABELS[normalizedStatus] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${className}`}
    >
      {label}
    </span>
  );
}

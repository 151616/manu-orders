import { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/order-domain";

const statusClassMap: Record<OrderStatus, string> = {
  NEW: "bg-slate-100 text-slate-800 ring-slate-200",
  QUEUED: "bg-blue-100 text-blue-800 ring-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-900 ring-amber-200",
  WAITING_ON_PARTS: "bg-violet-100 text-violet-800 ring-violet-200",
  DONE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  BLOCKED: "bg-rose-100 text-rose-800 ring-rose-200",
  CANCELLED: "bg-zinc-200 text-zinc-700 ring-zinc-300",
};

type StatusBadgeProps = {
  status: OrderStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${statusClassMap[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

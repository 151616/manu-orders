import { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/order-domain";

const statusClassMap: Record<OrderStatus, string> = {
  NEW: "bg-slate-100 text-slate-800",
  QUEUED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  WAITING_ON_PARTS: "bg-violet-100 text-violet-800",
  DONE: "bg-emerald-100 text-emerald-800",
  BLOCKED: "bg-rose-100 text-rose-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

type StatusBadgeProps = {
  status: OrderStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClassMap[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

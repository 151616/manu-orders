import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderById,
  removeOrderFromList,
} from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsDisplay } from "@/components/priority-stars-display";
import { RobotBadge } from "@/components/robot-badge";
import { StatusBadge } from "@/components/status-badge";
import { requireAuth } from "@/lib/auth";
import { getEtaDeltaDays, getRemainingEtaDays } from "@/lib/eta";
import { ORDER_CATEGORY_LABELS, ROBOT_LABELS, type OrderCategory, type Robot } from "@/lib/order-domain";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageMessage(saved: string | undefined) {
  if (saved === "created") return { tone: "success" as const, message: "Order created successfully." };
  if (saved === "requester") return { tone: "success" as const, message: "Requester fields updated." };
  if (saved === "manufacturing") return { tone: "success" as const, message: "Manufacturing fields updated." };
  return null;
}

const labelCls = "text-xs uppercase tracking-wide text-black/50 dark:text-white/50";
const valueCls = "text-sm text-black/80 dark:text-white/80";

export default async function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  const saved = first((await searchParams).saved);
  const message = pageMessage(saved);
  const canMutate = user.role === "ADMIN";
  const etaRemaining = getRemainingEtaDays(order);
  const etaDelta = getEtaDeltaDays(order);
  const isTerminal = order.status === "DONE" || order.status === "CANCELLED";
  const isOverdue = !isTerminal && etaDelta < 0;
  const isDueSoon = !isTerminal && etaDelta >= 0 && etaDelta <= 2;
  const removeAction = removeOrderFromList.bind(null, order.id);

  return (
    <section className="space-y-4 sm:space-y-5">
      {message ? <FormMessage tone={message.tone} message={message.message} /> : null}

      {/* Main detail card */}
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={labelCls}>Order Detail</p>
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">{order.title}</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {isOverdue ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
                OVERDUE
              </span>
            ) : null}
            {isDueSoon ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-white/60">
                DUE SOON
              </span>
            ) : null}
            <RobotBadge robot={order.robot} />
            <StatusBadge status={order.status} />
            {canMutate ? (
              <form action={removeAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Move to Trash
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={labelCls}>Priority</p>
            <PriorityStarsDisplay value={order.priority} />
          </div>
          <div>
            <p className={labelCls}>ETA</p>
            {isOverdue ? (
              <p className="text-sm font-medium text-red-700">Overdue by {Math.abs(etaDelta)} day(s)</p>
            ) : isDueSoon ? (
              <p className="text-sm font-medium text-black/70 dark:text-white/60">Due in {etaRemaining} day(s)</p>
            ) : (
              <p className={valueCls}>{etaRemaining} day(s)</p>
            )}
          </div>
          <div>
            <p className={labelCls}>Category</p>
            <p className={valueCls}>{ORDER_CATEGORY_LABELS[order.category as OrderCategory] ?? order.category}</p>
          </div>
          <div>
            <p className={labelCls}>Quantity</p>
            <p className={valueCls}>{order.quantity ?? "N/A"}</p>
          </div>
          <div>
            <p className={labelCls}>Order Number</p>
            <p className={valueCls}>{order.orderNumber ?? "N/A"}</p>
          </div>
          <div>
            <p className={labelCls}>Requester</p>
            <p className={valueCls}>{order.requesterName}</p>
          </div>
          <div>
            <p className={labelCls}>Vendor</p>
            <p className={valueCls}>{order.vendor ?? "N/A"}</p>
          </div>
          <div>
            <p className={labelCls}>Robot</p>
            <p className={valueCls}>
              {order.robot
                ? ROBOT_LABELS[order.robot as Robot] ?? order.robot
                : "Unassigned"}
            </p>
          </div>
          <div>
            <p className={labelCls}>Last Updated</p>
            <p className={valueCls}>{order.updatedAt.toLocaleDateString()}</p>
          </div>
          {order.description ? (
            <div className="sm:col-span-2">
              <p className={labelCls}>Description</p>
              <p className={valueCls}>{order.description}</p>
            </div>
          ) : null}
          {order.notesFromManu ? (
            <div className="sm:col-span-2">
              <p className={labelCls}>Manufacturing Notes</p>
              <p className={valueCls}>{order.notesFromManu}</p>
            </div>
          ) : null}
          {order.orderUrl ? (
            <div className="sm:col-span-2">
              <p className={labelCls}>Order URL</p>
              <a
                href={order.orderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-black/60 underline underline-offset-2 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                {order.orderUrl}
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {order.orderUrl ? (
            <Link
              href={order.orderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full justify-center rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Open Vendor Link
            </Link>
          ) : null}
          <Link
            href="/queue"
            className="inline-flex w-full justify-center rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import {
  listOrders,
  removeOrderFromList,
  restoreOrderFromTrash,
} from "@/app/orders/actions";
import { QueueRuntime } from "@/app/queue/queue-runtime";
import { QueueFiltersDropdown } from "@/app/queue/queue-filters-dropdown";
import { PriorityStarsDisplay } from "@/components/priority-stars-display";
import { StatusBadge } from "@/components/status-badge";
import { RobotBadge } from "@/components/robot-badge";
import { ToastBanner } from "@/components/toast-banner";
import { requireAuth } from "@/lib/auth";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
  ROBOTS,
  type OrderCategory,
  type OrderStatus,
  type Robot,
  ORDER_STATUSES,
} from "@/lib/order-domain";
import { getEtaDeltaDays, getRemainingEtaDays } from "@/lib/eta";

type QueuePageProps = {
  searchParams: Promise<{
    search?: string | string[];
    status?: string | string[];
    category?: string | string[];
    robot?: string | string[];
    toast?: string | string[];
    tone?: string | string[];
    undoOrderId?: string | string[];
    view?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueueHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim().length > 0) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `/queue?${qs}` : "/queue";
}

function toastMessage(code: string | undefined) {
  switch (code) {
    case "order-removed":
      return "Order moved to trash.";
    case "order-restored":
      return "Order restored from trash.";
    case "order-permanently-deleted":
      return "Order permanently deleted.";
    case "order-not-found":
      return "Debug: Order no longer exists.";
    case "already-removed":
      return "Debug: Order is already removed from the list.";
    case "forbidden":
      return "Debug: You do not have permission.";
    case "operation-failed":
      return "We could not process your request. Please try again.";
    default:
      return null;
  }
}

export default async function QueuePage({ searchParams }: QueuePageProps) {
  const user = await requireAuth();
  const params = await searchParams;

  const search = first(params.search)?.trim() ?? "";
  const statusRaw = first(params.status) ?? "ALL";
  const categoryRaw = first(params.category) ?? "ALL";
  const robotRaw = first(params.robot) ?? "ALL";
  const isCompact = first(params.view) === "compact";
  const toastCode = first(params.toast);
  const toastTone = first(params.tone) === "debug" ? "debug" : "success";
  const undoOrderId = first(params.undoOrderId)?.trim() ?? "";
  const toast = toastMessage(toastCode);
  const canRemoveFromList = user.role === "ADMIN";
  const showUndo =
    user.role === "ADMIN" &&
    toastCode === "order-removed" &&
    undoOrderId.length > 0;
  const undoRemoveAction = showUndo
    ? restoreOrderFromTrash.bind(null, undoOrderId, "queue")
    : null;

  const status: OrderStatus | "ALL" =
    ORDER_STATUSES.includes(statusRaw as OrderStatus)
      ? (statusRaw as OrderStatus)
      : "ALL";
  const category: OrderCategory | "ALL" =
    ORDER_CATEGORIES.includes(categoryRaw as OrderCategory)
      ? (categoryRaw as OrderCategory)
      : "ALL";
  const robot: Robot | "ALL" =
    ROBOTS.includes(robotRaw as Robot) ? (robotRaw as Robot) : "ALL";

  const orders = await listOrders({ search, status, category, robot });

  return (
    <section className="space-y-5 sm:space-y-6">
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}
      {showUndo && undoRemoveAction ? (
        <form
          action={undoRemoveAction}
          className="flex flex-col gap-2 rounded-md border border-black/15 bg-black/5 px-4 py-3 text-sm text-black sm:flex-row sm:items-center sm:justify-between dark:border-white/15 dark:bg-white/5 dark:text-white"
        >
          <p>Order moved to trash. Undo?</p>
          <button
            type="submit"
            className="w-full rounded-md border border-black/20 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          >
            Restore
          </button>
        </form>
      ) : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Queue
          </h1>
          <p className="text-sm text-black/65 dark:text-white/65">
            Auto-refresh every 15 seconds.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {user.role === "ADMIN" ? (
            <a
              href="/orders/export.csv"
              className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Export Orders CSV
            </a>
          ) : (
            <Link
              href="/requests?open=order"
              className="w-full rounded-lg border border-black bg-black px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black/85 sm:w-auto dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/85"
            >
              + Request a Part
            </Link>
          )}

          <Link
            href={buildQueueHref({ view: isCompact ? undefined : "compact", search: search || undefined, status: status !== "ALL" ? status : undefined, category: category !== "ALL" ? category : undefined, robot: robot !== "ALL" ? robot : undefined })}
            className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            {isCompact ? "Expanded View" : "Compact View"}
          </Link>

          <QueueRuntime monitor={false} />
        </div>
      </header>

      <QueueFiltersDropdown
        search={search}
        status={statusRaw}
        category={categoryRaw}
        robot={robotRaw}
        isCompact={isCompact}
      />

      {orders.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white/95 p-6 text-sm text-black/70 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          No orders found.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {orders.map((order) => {
            const etaRemaining = getRemainingEtaDays(order);
            const etaDelta = getEtaDeltaDays(order);
            const isTerminal =
              order.status === "DONE" || order.status === "CANCELLED";
            const isOverdue = !isTerminal && etaDelta < 0;
            const isDueSoon = !isTerminal && etaDelta >= 0 && etaDelta <= 2;
            const removeAction = removeOrderFromList.bind(null, order.id);

            return (
              <article
                key={order.id}
                className={
                  isOverdue
                    ? "space-y-3 rounded-xl border border-red-200 bg-red-50/95 p-4 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-red-500/30 dark:bg-red-900/20 dark:hover:border-red-500/50"
                    : isDueSoon
                      ? "space-y-3 rounded-xl border border-zinc-300 bg-zinc-50/95 p-4 shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-white/15 dark:bg-white/5 dark:hover:border-white/25"
                      : "space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
                }
              >
                <Link href={`/orders/${order.id}`} className="block space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold leading-snug text-black dark:text-white">
                      {order.title}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isCompact && isOverdue ? (
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">OVERDUE</span>
                      ) : isCompact && isDueSoon ? (
                        <span className="text-xs font-semibold text-black/60 dark:text-white/60">DUE SOON</span>
                      ) : null}
                      <RobotBadge robot={(order as { robot?: string | null }).robot} />
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {!isCompact ? (
                    <div className="grid grid-cols-1 gap-2 text-sm text-black/80 sm:grid-cols-2 dark:text-white/80">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-black/50 dark:text-white/50">
                          Priority
                        </p>
                        <PriorityStarsDisplay value={order.priority} />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-black/50 dark:text-white/50">
                          ETA
                        </p>
                        {isOverdue ? (
                          <p className="font-medium text-red-700">
                            Overdue by {Math.abs(etaDelta)} day(s)
                          </p>
                        ) : isDueSoon ? (
                          <p className="font-medium text-black dark:text-white">
                            Due in {etaRemaining} day(s)
                          </p>
                        ) : (
                          <p>{etaRemaining} day(s)</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-black/50 dark:text-white/50">
                          Category
                        </p>
                        <p>
                          {ORDER_CATEGORY_LABELS[order.category as OrderCategory] ??
                            order.category}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-black/50 dark:text-white/50">
                          Order Number
                        </p>
                        <p>{order.orderNumber ?? "N/A"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs text-black/60 dark:text-white/60">
                      <span>{ORDER_CATEGORY_LABELS[order.category as OrderCategory] ?? order.category}</span>
                      <span>·</span>
                      <PriorityStarsDisplay value={order.priority} />
                    </div>
                  )}
                </Link>

                {canRemoveFromList ? (
                  <form
                    action={removeAction}
                    className="border-t border-black/10 pt-3 dark:border-white/10"
                  >
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Move to Trash
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

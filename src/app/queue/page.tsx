import Link from "next/link";
import {
  listOrders,
  removeOrderFromList,
  restoreOrderFromTrash,
} from "@/app/orders/actions";
import { QueueRuntime } from "@/app/queue/queue-runtime";
import { PriorityStarsDisplay } from "@/components/priority-stars-display";
import { StatusBadge } from "@/components/status-badge";
import { ToastBanner } from "@/components/toast-banner";
import { requireAuth } from "@/lib/auth";
import {
  ORDER_CATEGORIES,
  ORDER_CATEGORY_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderCategory,
  type OrderStatus,
} from "@/lib/order-domain";
import { getEtaDeltaDays, getRemainingEtaDays } from "@/lib/eta";

type QueuePageProps = {
  searchParams: Promise<{
    search?: string | string[];
    status?: string | string[];
    category?: string | string[];
    monitor?: string | string[];
    filters?: string | string[];
    toast?: string | string[];
    tone?: string | string[];
    undoOrderId?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueueHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim().length > 0) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `/queue?${queryString}` : "/queue";
}

function toastMessage(code: string | undefined) {
  switch (code) {
    case "order-removed":
      return "Order moved to trash.";
    case "order-restored":
      return "Order restored from trash.";
    case "order-permanently-deleted":
      return "Order permanently deleted.";
    case "elevated":
      return "Session elevated to ADMIN.";
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
  const isMonitor = first(params.monitor) === "1";
  const showFilters = !isMonitor || first(params.filters) === "1";
  const toastCode = first(params.toast);
  const toastTone = first(params.tone) === "debug" ? "debug" : "success";
  const undoOrderId = first(params.undoOrderId)?.trim() ?? "";
  const toast = toastMessage(toastCode);
  const canRemoveFromList = user.role === "ADMIN" && !isMonitor;
  const showUndo =
    user.role === "ADMIN" &&
    !isMonitor &&
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

  const baseQuery = {
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    category: category === "ALL" ? undefined : category,
  };

  const orders = await listOrders({
    search,
    status,
    category,
  });

  return (
    <section className={isMonitor ? "space-y-4" : "space-y-5 sm:space-y-6"}>
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}
      {showUndo && undoRemoveAction ? (
        <form
          action={undoRemoveAction}
          className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>Order moved to trash. Undo?</p>
          <button
            type="submit"
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 sm:w-auto"
          >
            Restore
          </button>
        </form>
      ) : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className={
              isMonitor
                ? "text-3xl font-bold tracking-tight text-black"
                : "text-2xl font-bold tracking-tight text-black"
            }
          >
            Queue
          </h1>
          <p className={isMonitor ? "text-base text-black/65" : "text-sm text-black/65"}>
            Auto-refresh every 15 seconds.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {user.role === "ADMIN" ? (
            <a
              href="/orders/export.csv"
              className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
            >
              Export Orders CSV
            </a>
          ) : null}

          {isMonitor ? (
            <Link
              href={buildQueueHref(baseQuery)}
              className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
            >
              Exit Monitor
            </Link>
          ) : (
            <Link
              href={buildQueueHref({ ...baseQuery, monitor: "1" })}
              className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
            >
              Monitor Mode
            </Link>
          )}

          {isMonitor ? (
            <Link
              href={buildQueueHref({
                ...baseQuery,
                monitor: "1",
                filters: showFilters ? undefined : "1",
              })}
              className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Link>
          ) : null}

          <QueueRuntime monitor={isMonitor} />
        </div>
      </header>

      {showFilters ? (
        <form
          className="grid gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:grid-cols-4"
          action="/queue"
        >
          {isMonitor ? <input type="hidden" name="monitor" value="1" /> : null}
          {isMonitor ? <input type="hidden" name="filters" value="1" /> : null}

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-black/70">
              Search
            </span>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Title, order number, requester"
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-black/70">
              Status
            </span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">All</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {ORDER_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-black/70">
              Category
            </span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">All</option>
              {ORDER_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {ORDER_CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black/90 sm:w-auto"
            >
              Apply
            </button>
            <Link
              href={buildQueueHref(
                isMonitor ? { monitor: "1", filters: "1" } : {},
              )}
              className="w-full rounded-lg border border-black/20 px-4 py-2 text-center text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
            >
              Reset
            </Link>
          </div>
        </form>
      ) : null}

      {orders.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white/95 p-6 text-sm text-black/70 shadow-sm">
          No orders found.
        </p>
      ) : (
        <div
          className={
            isMonitor
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-3 sm:grid-cols-2"
          }
        >
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
                    ? isMonitor
                      ? "space-y-4 rounded-xl border border-red-200 bg-red-50 p-5 transition hover:border-red-300 hover:shadow-sm"
                      : "space-y-3 rounded-xl border border-red-200 bg-red-50/95 p-4 shadow-sm transition hover:border-red-300 hover:shadow-md"
                    : isDueSoon
                      ? isMonitor
                        ? "space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                        : "space-y-3 rounded-xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                      : isMonitor
                        ? "space-y-4 rounded-xl border border-slate-200 bg-white/95 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        : "space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                }
              >
                <Link href={`/orders/${order.id}`} className="block space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2
                      className={
                        isMonitor
                        ? "text-xl font-semibold text-black"
                          : "text-base font-semibold leading-snug text-black"
                      }
                    >
                      {order.title}
                    </h2>
                    <StatusBadge status={order.status} />
                  </div>

                  <div
                    className={
                      isMonitor
                        ? "grid grid-cols-2 gap-3 text-base text-black/85"
                        : "grid grid-cols-1 gap-2 text-sm text-black/80 sm:grid-cols-2"
                    }
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-black/50">
                        Priority
                      </p>
                      <PriorityStarsDisplay
                        value={order.priority}
                        className={isMonitor ? "text-lg text-amber-500" : undefined}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-black/50">
                        ETA
                      </p>
                      {isOverdue ? (
                        <p className="font-medium text-red-700">
                          Overdue by {Math.abs(etaDelta)} day(s)
                        </p>
                      ) : isDueSoon ? (
                        <p className="font-medium text-amber-900">
                          Due in {etaRemaining} day(s)
                        </p>
                      ) : (
                        <p>{etaRemaining} day(s)</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-black/50">
                        Category
                      </p>
                      <p>
                        {ORDER_CATEGORY_LABELS[order.category as OrderCategory] ??
                          order.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-black/50">
                        Order Number
                      </p>
                      <p>{order.orderNumber ?? "N/A"}</p>
                    </div>
                  </div>
                </Link>

                {canRemoveFromList ? (
                  <form
                    action={removeAction}
                    className="border-t border-black/10 pt-3"
                  >
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
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

import Link from "next/link";
import { OrderCategory, OrderStatus } from "@prisma/client";
import { listOrders, removeOrderFromList } from "@/app/orders/actions";
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
} from "@/lib/order-domain";
import { getRemainingEtaDays } from "@/lib/eta";

type QueuePageProps = {
  searchParams: Promise<{
    search?: string | string[];
    status?: string | string[];
    category?: string | string[];
    monitor?: string | string[];
    filters?: string | string[];
    toast?: string | string[];
    tone?: string | string[];
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
      return "Order removed from the active list.";
    case "order-not-found":
      return "Debug: Order no longer exists.";
    case "already-removed":
      return "Debug: Order is already removed from the list.";
    case "forbidden":
      return "Debug: You do not have permission.";
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
  const toast = toastMessage(toastCode);
  const canRemoveFromList = user.role === "MANUFACTURING" && !isMonitor;

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
    <section className={isMonitor ? "space-y-4" : "space-y-6"}>
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={isMonitor ? "text-3xl font-bold text-black" : "text-2xl font-semibold text-black"}>
            Queue
          </h1>
          <p className={isMonitor ? "text-base text-black/70" : "text-sm text-black/70"}>
            Auto-refresh every 15 seconds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMonitor ? (
            <Link
              href={buildQueueHref(baseQuery)}
              className="rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              Exit Monitor
            </Link>
          ) : (
            <Link
              href={buildQueueHref({ ...baseQuery, monitor: "1" })}
              className="rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-black/5"
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
              className="rounded-md border border-black/20 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Link>
          ) : null}

          <QueueRuntime monitor={isMonitor} />
        </div>
      </header>

      {showFilters ? (
        <form
          className="grid gap-2 rounded-lg border border-black/10 bg-white p-3 sm:grid-cols-4"
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
              className="w-full rounded-md border border-black/20 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-black/70">
              Status
            </span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
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
              className="w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-black/50 focus:ring-2 focus:ring-black/20"
            >
              <option value="ALL">All</option>
              {ORDER_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {ORDER_CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-4 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Apply
            </button>
            <Link
              href={buildQueueHref(
                isMonitor ? { monitor: "1", filters: "1" } : {},
              )}
              className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              Reset
            </Link>
          </div>
        </form>
      ) : null}

      {orders.length === 0 ? (
        <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-black/70">
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
            const removeAction = removeOrderFromList.bind(null, order.id);

            return (
              <article
                key={order.id}
                className={
                  isMonitor
                    ? "space-y-4 rounded-xl border border-black/10 bg-white p-5 transition hover:border-black/30 hover:shadow-sm"
                    : "space-y-3 rounded-lg border border-black/10 bg-white p-4 transition hover:border-black/30 hover:shadow-sm"
                }
              >
                <Link href={`/orders/${order.id}`} className="block space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2
                      className={
                        isMonitor
                          ? "text-xl font-semibold text-black"
                          : "text-base font-semibold text-black"
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
                        : "grid grid-cols-2 gap-2 text-sm text-black/80"
                    }
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/50">
                        Priority
                      </p>
                      <PriorityStarsDisplay
                        value={order.priority}
                        className={isMonitor ? "text-lg text-amber-500" : undefined}
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/50">
                        ETA
                      </p>
                      <p>{etaRemaining} day(s)</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/50">
                        Category
                      </p>
                      <p>{ORDER_CATEGORY_LABELS[order.category]}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-black/50">
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
                      className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove from list
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

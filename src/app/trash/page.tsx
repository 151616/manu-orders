import Link from "next/link";
import {
  listDeletedOrders,
  restoreOrderFromTrash,
  permanentlyDeleteOrder,
} from "@/app/orders/actions";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { ORDER_CATEGORY_LABELS, type OrderCategory } from "@/lib/order-domain";

export default async function TrashPage() {
  await requireAdmin();
  const orders = await listDeletedOrders();

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Trash
          </h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {orders.length} deleted order{orders.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <Link
          href="/queue"
          className="rounded-lg border border-black/20 px-3 py-2 text-sm font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          Back to Queue
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white/95 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-black/50 dark:text-white/50">
            Trash is empty.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => {
            const restoreAction = restoreOrderFromTrash.bind(null, order.id, "trash");
            const deleteAction = permanentlyDeleteOrder.bind(null, order.id, "trash");

            return (
              <article
                key={order.id}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-black dark:text-white">
                      {order.title}
                    </h2>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {ORDER_CATEGORY_LABELS[order.category as OrderCategory] ?? order.category}
                      {" · "}
                      {order.requesterName}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="flex gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                  <form action={restoreAction}>
                    <button
                      type="submit"
                      className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                    >
                      Restore
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Delete Permanently
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

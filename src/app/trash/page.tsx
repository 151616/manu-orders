import { redirect } from "next/navigation";
import {
  listDeletedOrders,
  permanentlyDeleteOrder,
  restoreOrderFromTrash,
} from "@/app/orders/actions";
import { ToastBanner } from "@/components/toast-banner";
import { requireAuth } from "@/lib/auth";

type TrashPageProps = {
  searchParams: Promise<{
    toast?: string | string[];
    tone?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toastMessage(code: string | undefined) {
  switch (code) {
    case "order-restored":
      return "Order restored from trash.";
    case "order-permanently-deleted":
      return "Order permanently deleted.";
    case "order-not-found":
      return "Debug: Order no longer exists.";
    case "operation-failed":
      return "We could not process your request. Please try again.";
    default:
      return null;
  }
}

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/queue");
  }

  const params = await searchParams;
  const toastCode = first(params.toast);
  const toastTone = first(params.tone) === "debug" ? "debug" : "success";
  const toast = toastMessage(toastCode);
  const deletedOrders = await listDeletedOrders();

  return (
    <section className="space-y-4">
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-black">Trash</h1>
        <p className="text-sm text-black/70">
          Deleted orders can be restored or permanently removed.
        </p>
      </header>

      <div className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
        {deletedOrders.length === 0 ? (
          <p className="text-sm text-black/70">No deleted orders.</p>
        ) : (
          <ul className="space-y-2">
            {deletedOrders.map((order) => {
              const restoreAction = restoreOrderFromTrash.bind(
                null,
                order.id,
                "trash",
              );
              const permanentDeleteAction = permanentlyDeleteOrder.bind(
                null,
                order.id,
                "trash",
              );

              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-black">{order.title}</p>
                    <p className="text-xs text-black/60">
                      Deleted on {order.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={restoreAction}>
                      <button
                        type="submit"
                        className="rounded-md border border-black/20 bg-white px-3 py-1 text-xs font-medium text-black hover:bg-black/5"
                      >
                        Restore
                      </button>
                    </form>
                    <form action={permanentDeleteAction}>
                      <button
                        type="submit"
                        className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Permanently Delete
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

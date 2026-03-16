import { redirect } from "next/navigation";
import {
  listDeletedBookmarksForCurrentUser,
  permanentlyDeleteBookmark,
  restoreBookmark,
} from "@/app/bookmarks/actions";
import {
  listDeletedOrders,
  permanentlyDeleteOrder,
  restoreOrderFromTrash,
} from "@/app/orders/actions";
import { BOOKMARK_KIND_LABELS } from "@/lib/bookmark-domain";
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
    case "bookmark-restored":
      return "Bookmark restored from trash.";
    case "bookmark-permanently-deleted":
      return "Bookmark permanently deleted.";
    case "bookmark-not-found":
      return "Debug: Bookmark no longer exists.";
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
  const deletedBookmarks = await listDeletedBookmarksForCurrentUser();

  return (
    <section className="space-y-4">
      {toast ? <ToastBanner tone={toastTone} message={toast} /> : null}

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">Trash</h1>
        <p className="text-sm text-black/65 dark:text-white/65">
          Deleted orders and bookmarks can be restored or permanently removed.
        </p>
      </header>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold text-black dark:text-white">Orders</h2>
        {deletedOrders.length === 0 ? (
          <p className="text-sm text-black/70 dark:text-white/70">No deleted orders.</p>
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
                  className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5"
                >
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{order.title}</p>
                    <p className="text-xs text-black/60 dark:text-white/60">
                      Deleted on {order.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <form action={restoreAction}>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      >
                        Restore
                      </button>
                    </form>
                    <form action={permanentDeleteAction}>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
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

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold text-black dark:text-white">Bookmarks</h2>
        {deletedBookmarks.length === 0 ? (
          <p className="text-sm text-black/70 dark:text-white/70">No deleted bookmarks.</p>
        ) : (
          <ul className="space-y-2">
            {deletedBookmarks.map((bookmark) => {
              const restoreAction = restoreBookmark.bind(
                null,
                bookmark.id,
                "trash",
              );
              const permanentDeleteAction = permanentlyDeleteBookmark.bind(
                null,
                bookmark.id,
                "trash",
              );

              return (
                <li
                  key={bookmark.id}
                  className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5"
                >
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {bookmark.name}{" "}
                      <span className="text-xs font-normal text-black/55 dark:text-white/55">
                        ({BOOKMARK_KIND_LABELS[bookmark.kind]})
                      </span>
                    </p>
                    {bookmark.kind === "SITE" && bookmark.siteUrl ? (
                      <p className="truncate text-xs text-black/60">{bookmark.siteUrl}</p>
                    ) : null}
                    <p className="text-xs text-black/60 dark:text-white/60">
                      Deleted on {bookmark.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <form action={restoreAction}>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 sm:w-auto dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      >
                        Restore
                      </button>
                    </form>
                    <form action={permanentDeleteAction}>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
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

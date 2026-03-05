import { BookmarkCard } from "@/app/bookmarks/bookmark-card";
import { CreateBookmarkForm } from "@/app/bookmarks/create-bookmark-form";
import {
  listBookmarksForCurrentUser,
  listDeletedBookmarksForCurrentUser,
  permanentlyDeleteBookmark,
  restoreBookmark,
} from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";
import { requireAuth } from "@/lib/auth";

type BookmarksPageProps = {
  searchParams: Promise<{
    saved?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageMessage(saved: string | undefined) {
  if (saved === "bookmark-created") return { tone: "success" as const, text: "Bookmark created." };
  if (saved === "bookmark-updated") return { tone: "success" as const, text: "Bookmark updated." };
  if (saved === "bookmark-deleted") return { tone: "success" as const, text: "Bookmark moved to trash." };
  if (saved === "bookmark-restored") return { tone: "success" as const, text: "Bookmark restored." };
  if (saved === "bookmark-permanently-deleted") {
    return { tone: "success" as const, text: "Bookmark permanently deleted." };
  }
  if (saved === "bookmark-not-found") {
    return { tone: "error" as const, text: "Bookmark not found." };
  }
  if (saved === "bookmark-failed") {
    return {
      tone: "error" as const,
      text: "We could not process your request. Please try again.",
    };
  }
  return null;
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const user = await requireAuth();
  const canMutate = user.role === "ADMIN";
  const bookmarks = await listBookmarksForCurrentUser();
  const deletedBookmarks = canMutate
    ? await listDeletedBookmarksForCurrentUser()
    : [];
  const saved = first((await searchParams).saved);
  const message = pageMessage(saved);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-black">Bookmarks</h1>
        <p className="text-sm text-black/70">
          {canMutate
            ? "Manage your personal order templates and create orders from them."
            : "Read-only bookmark templates for your account."}
        </p>
      </header>

      {message ? <FormMessage tone={message.tone} message={message.text} /> : null}

      {canMutate ? <CreateBookmarkForm /> : null}

      <div className="space-y-3">
        {bookmarks.length === 0 ? (
          <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-black/70">
            No bookmarks yet.
          </p>
        ) : (
          bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              canMutate={canMutate}
            />
          ))
        )}
      </div>

      {canMutate ? (
        <div className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
          <h2 className="text-lg font-semibold text-black">Trash</h2>
          {deletedBookmarks.length === 0 ? (
            <p className="text-sm text-black/70">No deleted bookmarks.</p>
          ) : (
            <ul className="space-y-2">
              {deletedBookmarks.map((bookmark) => {
                const restoreAction = restoreBookmark.bind(null, bookmark.id);
                const permanentDeleteAction = permanentlyDeleteBookmark.bind(
                  null,
                  bookmark.id,
                );

                return (
                  <li
                    key={bookmark.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">{bookmark.name}</p>
                      <p className="text-xs text-black/60">
                        Deleted on {bookmark.updatedAt.toLocaleDateString()}
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
      ) : null}
    </section>
  );
}

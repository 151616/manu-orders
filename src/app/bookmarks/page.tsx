import { BookmarkCard } from "@/app/bookmarks/bookmark-card";
import { CreateBookmarkForm } from "@/app/bookmarks/create-bookmark-form";
import { listBookmarksForCurrentUser } from "@/app/bookmarks/actions";
import { FormMessage } from "@/components/form-message";

type BookmarksPageProps = {
  searchParams: Promise<{
    saved?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function successMessage(saved: string | undefined) {
  if (saved === "bookmark-created") return "Bookmark created.";
  if (saved === "bookmark-updated") return "Bookmark updated.";
  if (saved === "bookmark-deleted") return "Bookmark deleted.";
  return null;
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const bookmarks = await listBookmarksForCurrentUser();
  const saved = first((await searchParams).saved);
  const message = successMessage(saved);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-black">Bookmarks</h1>
        <p className="text-sm text-black/70">
          Manage your personal order templates and create orders from them.
        </p>
      </header>

      {message ? <FormMessage tone="success" message={message} /> : null}

      <CreateBookmarkForm />

      <div className="space-y-3">
        {bookmarks.length === 0 ? (
          <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-black/70">
            No bookmarks yet.
          </p>
        ) : (
          bookmarks.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))
        )}
      </div>
    </section>
  );
}

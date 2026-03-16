import { BookmarkCard } from "@/app/bookmarks/bookmark-card";
import { CreateBookmarkForm } from "@/app/bookmarks/create-bookmark-form";
import {
  listSiteBookmarksForCurrentUser,
  listTemplateBookmarksForCurrentUser,
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
  const siteBookmarks = await listSiteBookmarksForCurrentUser();
  const templateBookmarks = await listTemplateBookmarksForCurrentUser();
  const saved = first((await searchParams).saved);
  const message = pageMessage(saved);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">Bookmarks</h1>
        <p className="text-sm text-black/65 dark:text-white/65">
          {canMutate
            ? "Manage your personal order templates and create orders from them."
            : "Read-only bookmark templates for your account."}
        </p>
      </header>

      {message ? <FormMessage tone={message.tone} message={message.text} /> : null}

      {canMutate ? <CreateBookmarkForm /> : null}

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Websites</h2>
        {siteBookmarks.length === 0 ? (
          <p className="text-sm text-black/70 dark:text-white/70">No website bookmarks yet.</p>
        ) : (
          <ul className="space-y-2">
            {siteBookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} canMutate={canMutate} />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Templates</h2>
        {templateBookmarks.length === 0 ? (
          <p className="text-sm text-black/70 dark:text-white/70">No template bookmarks yet.</p>
        ) : (
          <ul className="space-y-2">
            {templateBookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} canMutate={canMutate} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

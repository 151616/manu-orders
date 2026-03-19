import { requireAuth } from "@/lib/auth";

export default async function BookmarksPage() {
  await requireAuth();

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          Bookmarks
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          This page is being rebuilt with the new database.
        </p>
      </header>
      <div className="rounded-xl border border-zinc-200 bg-white/95 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-black/50 dark:text-white/50">
          Bookmarks will be available once they have been migrated to Firestore.
        </p>
      </div>
    </section>
  );
}

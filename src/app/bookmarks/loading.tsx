function SkeletonBookmarkCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-56 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="h-7 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

export default function BookmarksLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-64 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Create form skeleton */}
      <div className="animate-pulse rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <div className="mb-4 h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-3">
          <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      {/* Bookmark cards */}
      <SkeletonBookmarkCard />
      <SkeletonBookmarkCard />
      <SkeletonBookmarkCard />
    </div>
  );
}

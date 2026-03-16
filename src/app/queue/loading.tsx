function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/5 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-1/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

export default function QueueLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Filter bar skeleton */}
      <div className="animate-pulse rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-9 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>

      {/* Order cards */}
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

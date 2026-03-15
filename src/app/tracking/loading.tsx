function SkeletonRequestCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default function TrackingLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-52 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="animate-pulse h-9 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Request cards */}
      <SkeletonRequestCard />
      <SkeletonRequestCard />
      <SkeletonRequestCard />
    </div>
  );
}

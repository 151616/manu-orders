function SkeletonField() {
  return (
    <div className="space-y-1">
      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

function SkeletonSection({ rows = 2 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </div>
    </div>
  );
}

export default function OrderDetailLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Main detail card */}
      <div className="animate-pulse space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-7 w-64 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonField key={i} />
          ))}
          <div className="space-y-1 sm:col-span-2">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <div className="h-5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Requester + Manufacturing forms */}
      <SkeletonSection rows={3} />
      <SkeletonSection rows={2} />

      {/* Activity */}
      <div className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

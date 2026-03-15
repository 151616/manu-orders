function SkeletonTrashItem() {
  return (
    <div className="animate-pulse flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="space-y-2">
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export default function TrashLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="animate-pulse space-y-2">
        <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-56 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Items */}
      <SkeletonTrashItem />
      <SkeletonTrashItem />
      <SkeletonTrashItem />
    </div>
  );
}

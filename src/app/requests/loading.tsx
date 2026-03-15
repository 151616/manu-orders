export default function RequestsLoading() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </header>

      {["Part Requests", "Tracking Requests"].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-white/5" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

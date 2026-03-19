import { requireAdmin } from "@/lib/auth";

export default async function RolesPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <a
          href="/settings"
          className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          &larr; Settings
        </a>
        <span className="text-black/20 dark:text-white/20">/</span>
        <h1 className="text-xl font-bold text-black dark:text-white">Roles</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white/95 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-black/50 dark:text-white/50">
          Role management is being rebuilt with the new database.
        </p>
      </div>
    </div>
  );
}

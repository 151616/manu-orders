import { requireAuth } from "@/lib/auth";
import { ThemeSettings } from "@/components/theme-settings";
import { ChangeCodeSettings } from "@/components/change-code-settings";

export default async function SettingsPage() {
  const user = await requireAuth();
  const isSysdev = user.permissionLevel === 1; // Level 1 is the highest on-site user
  const isAdmin  = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-bold text-black dark:text-white">Settings</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">Manage your preferences.</p>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Appearance
        </h2>
        <ThemeSettings />
      </section>

      {isAdmin && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Roles
          </h2>
          <a
            href="/settings/roles"
            className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/[0.02] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/[0.06]"
          >
            Manage Roles
            <span className="text-black/40 dark:text-white/40">→</span>
          </a>
        </section>
      )}

      {isSysdev && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Access Codes
          </h2>
          <ChangeCodeSettings />
        </section>
      )}
    </div>
  );
}

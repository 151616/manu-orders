import { requireAuth } from "@/lib/auth";
import { ThemeSettings } from "@/components/theme-settings";

export default async function SettingsPage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-bold text-black dark:text-white">Settings</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">Manage your preferences.</p>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Appearance
        </h2>
        <ThemeSettings />
      </section>
    </div>
  );
}

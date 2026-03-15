"use client";

import { useTheme, type Theme } from "@/components/theme-provider";

const options: { value: Theme; label: string; icon: string; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: "☀️",
    description: "Always use the light theme",
  },
  {
    value: "dark",
    label: "Dark",
    icon: "🌙",
    description: "Always use the dark theme",
  },
  {
    value: "system",
    label: "System",
    icon: "💻",
    description: "Follow your device setting",
  },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
              active
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 bg-white text-black hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <p className="font-semibold">{opt.label}</p>
              <p
                className={`text-sm ${
                  active ? "text-white/70 dark:text-black/60" : "text-black/50 dark:text-white/50"
                }`}
              >
                {opt.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

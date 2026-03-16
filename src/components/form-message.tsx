type FormMessageProps = {
  tone: "error" | "success";
  message: string;
};

const toneStyles: Record<FormMessageProps["tone"], string> = {
  error: "border-red-200 bg-red-50 text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300",
  success: "border-black/15 bg-black/5 text-black/70 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/70",
};

export function FormMessage({ tone, message }: FormMessageProps) {
  return (
    <p
      className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${toneStyles[tone]}`}
    >
      {message}
    </p>
  );
}

type FormMessageProps = {
  tone: "error" | "success";
  message: string;
};

const toneStyles: Record<FormMessageProps["tone"], string> = {
  error: "border-red-200 bg-red-50 text-red-700 shadow-sm",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
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

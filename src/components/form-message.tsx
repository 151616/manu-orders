type FormMessageProps = {
  tone: "error" | "success";
  message: string;
};

const toneStyles: Record<FormMessageProps["tone"], string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function FormMessage({ tone, message }: FormMessageProps) {
  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${toneStyles[tone]}`}>
      {message}
    </p>
  );
}

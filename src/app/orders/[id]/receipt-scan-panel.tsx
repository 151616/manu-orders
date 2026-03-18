"use client";

import { useRef, useState, useTransition } from "react";
import { scanReceiptForOrder } from "@/app/orders/receipt-scan-actions";

type Props = {
  orderId: string;
};

export function ReceiptScanPanel({ orderId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; orderNumber: string | null }
    | { ok: false; error: string }
    | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await scanReceiptForOrder(orderId, fd);
      setResult(res);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
      >
        📄 Scan Receipt
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-900/10">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Scan Receipt
        </p>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); }}
          className="text-xs text-amber-700/60 hover:text-amber-800 dark:text-amber-400/60 dark:hover:text-amber-300"
        >
          ✕ Cancel
        </button>
      </div>

      {result ? (
        result.ok ? (
          <div className="space-y-2">
            {result.orderNumber ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                ✓ Order number <span className="font-semibold">{result.orderNumber}</span> applied — status moved to <span className="font-semibold">New</span>.
              </p>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                No order number found in receipt. You can enter it manually in the Requester Fields below.
              </p>
            )}
            <button
              type="button"
              onClick={() => { setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-amber-700/70 underline dark:text-amber-400/70"
            >
              Scan another
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400">Error: {result.error}</p>
            <button
              type="button"
              onClick={() => { setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-red-600/70 underline dark:text-red-400/70"
            >
              Try again
            </button>
          </div>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Upload a receipt image or PDF. The order number will be extracted automatically and this order will move to <strong>New</strong>.
          </p>
          <input
            ref={fileRef}
            type="file"
            name="receipt"
            accept="image/*,application/pdf"
            required
            className="block w-full text-xs text-black/70 file:mr-3 file:rounded file:border-0 file:bg-amber-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-amber-800 hover:file:bg-amber-200 dark:text-white/70 dark:file:bg-amber-900/40 dark:file:text-amber-300"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            {pending ? "Scanning…" : "Extract Order Number"}
          </button>
        </form>
      )}
    </div>
  );
}

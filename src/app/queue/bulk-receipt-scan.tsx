"use client";

import { useRef, useState, useTransition } from "react";
import {
  scanReceiptAndMatch,
  applyReceiptToOrders,
  type ReceiptMatchedOrder,
  type ReceiptLineItem,
} from "@/app/orders/receipt-scan-actions";

export function BulkReceiptScan() {
  const [open, setOpen] = useState(false);
  const [scanPending, startScan] = useTransition();
  const [applyPending, startApply] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  type ScanState =
    | null
    | { phase: "error"; error: string }
    | {
        phase: "preview";
        orderNumber: string | null;
        matched: ReceiptMatchedOrder[];
        unmatched: ReceiptLineItem[];
        selectedIds: Set<string>;
      }
    | { phase: "done"; updatedCount: number };

  const [state, setState] = useState<ScanState>(null);

  function handleScan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startScan(async () => {
      const res = await scanReceiptAndMatch(fd);
      if (!res.ok) {
        setState({ phase: "error", error: res.error });
        return;
      }
      const matchedIds = new Set(res.matched.map((m) => m.orderId));
      const unmatchedItems = res.items.filter(
        (item) => !res.matched.find((m) => m.matchedItem === item.name),
      );
      setState({
        phase: "preview",
        orderNumber: res.orderNumber,
        matched: res.matched,
        unmatched: unmatchedItems,
        selectedIds: matchedIds,
      });
    });
  }

  function toggleOrder(orderId: string) {
    setState((prev) => {
      if (!prev || prev.phase !== "preview") return prev;
      const next = new Set(prev.selectedIds);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return { ...prev, selectedIds: next };
    });
  }

  function handleApply() {
    if (!state || state.phase !== "preview") return;
    const { selectedIds, orderNumber } = state;
    if (!orderNumber) return;
    startApply(async () => {
      const res = await applyReceiptToOrders([...selectedIds], orderNumber);
      if (!res.ok) {
        setState({ phase: "error", error: res.error });
        return;
      }
      setState({ phase: "done", updatedCount: res.updatedCount });
    });
  }

  function reset() {
    setState(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
      >
        📄 Scan Receipt
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-900/10">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-amber-900 dark:text-amber-300">Scan Receipt</p>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          className="text-xs text-amber-700/60 hover:text-amber-800 dark:text-amber-400/60"
        >
          ✕ Close
        </button>
      </div>

      {/* ── Error ── */}
      {state?.phase === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {state.error}</p>
          <button type="button" onClick={reset} className="text-xs text-red-600/70 underline">Try again</button>
        </div>
      )}

      {/* ── Done ── */}
      {state?.phase === "done" && (
        <div className="space-y-2">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ {state.updatedCount} order{state.updatedCount !== 1 ? "s" : ""} marked as ordered and moved to <strong>New</strong>.
          </p>
          <button type="button" onClick={reset} className="text-xs text-green-700/70 underline dark:text-green-400/70">Scan another receipt</button>
        </div>
      )}

      {/* ── Preview / confirm ── */}
      {state?.phase === "preview" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">Order number extracted:</p>
            <p className="text-base font-bold text-amber-900 dark:text-amber-200">
              {state.orderNumber ?? <span className="italic font-normal text-amber-700/60">Not found</span>}
            </p>
          </div>

          {state.matched.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/60 dark:text-amber-400/60">
                Matched orders ({state.matched.length})
              </p>
              {state.matched.map((m) => (
                <label
                  key={m.orderId}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-500/20 dark:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={state.selectedIds.has(m.orderId)}
                    onChange={() => toggleOrder(m.orderId)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-black dark:text-white">{m.orderTitle}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      Matched to receipt item: <span className="italic">&ldquo;{m.matchedItem}&rdquo;</span>
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-700/70 dark:text-amber-400/70">
              No pending orders matched the receipt items. You can still apply the order number manually to individual orders.
            </p>
          )}

          {state.unmatched.length > 0 && (
            <p className="text-xs text-amber-700/50 dark:text-amber-400/50">
              {state.unmatched.length} receipt item{state.unmatched.length !== 1 ? "s" : ""} had no matching pending order and will be ignored.
            </p>
          )}

          {state.matched.length > 0 && state.orderNumber && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={applyPending || state.selectedIds.size === 0}
                onClick={handleApply}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500"
              >
                {applyPending ? "Applying…" : `Apply to ${state.selectedIds.size} order${state.selectedIds.size !== 1 ? "s" : ""}`}
              </button>
              <button type="button" onClick={reset} className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Upload form (shown when no scan result yet) ── */}
      {!state && (
        <form onSubmit={handleScan} className="space-y-3">
          <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
            Upload an order receipt or confirmation PDF/image. Items will be matched to pending orders automatically.
          </p>
          <input
            ref={fileRef}
            type="file"
            name="receipt"
            accept="image/*,application/pdf"
            required
            className="block w-full text-sm text-black/70 file:mr-3 file:rounded file:border-0 file:bg-amber-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-amber-800 hover:file:bg-amber-200 dark:text-white/70 dark:file:bg-amber-900/40 dark:file:text-amber-300"
          />
          <button
            type="submit"
            disabled={scanPending}
            className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500"
          >
            {scanPending ? "Scanning…" : "Extract & Match"}
          </button>
        </form>
      )}
    </div>
  );
}

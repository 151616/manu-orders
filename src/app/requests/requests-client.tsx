"use client";

import { useState, useEffect, useActionState, useMemo, useCallback, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { NewOrderRequestForm } from "@/app/requests/new-order/new-order-request-form";
import { NewTrackingRequestForm } from "@/app/requests/new-tracking/new-tracking-request-form";
import {
  updateOrderRequest,
  updateTrackingRequest,
  approveOrderRequest,
  approveOrderRequestForm,
  rejectOrderRequest,
  approveTrackingRequest,
  rejectTrackingRequest,
} from "@/app/requests/actions";
import { scanReceiptForOrder } from "@/app/orders/receipt-scan-actions";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";
import { CustomSelect } from "@/components/custom-select";
import { PriorityStarsInput } from "@/components/priority-stars-input";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage } from "@/components/form-message";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";
import type { OrderCategory, RequestStatus } from "@prisma/client";

const EDIT_WINDOW_MS = 30_000;

type ManuRequestType = "CNC" | "DRILL" | "TAP" | "CUT" | "OTHER";

const TYPE_LABELS: Record<ManuRequestType, string> = {
  CNC: "CNC",
  DRILL: "Drill",
  TAP: "Tap",
  CUT: "Cut",
  OTHER: "Other",
};

export type SerializedOrderRequest = {
  id: string;
  createdAt: string;
  status: RequestStatus;
  submittedByLabel: string;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  requesterName: string;
  vendor: string | null;
  orderUrl: string | null;
  orderNumber: string | null;
  quantity: number | null;
  category: string;
  priority: number;
  etaDays: number;
};

export type SerializedTrackingRequest = {
  id: string;
  createdAt: string;
  status: RequestStatus;
  submittedByLabel: string;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  type: string;
  otherType: string | null;
};

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "PENDING") {
    return (
      <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-white/60">
        Pending
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Rejected
    </span>
  );
}

function useCountdown(createdAt: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.ceil((EDIT_WINDOW_MS - elapsed) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return secondsLeft;
}

function OrderRequestCard({
  req,
  isAdmin,
}: {
  req: SerializedOrderRequest;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approveScanOpen, setApproveScanOpen] = useState(false);
  const [approveState, setApproveState] = useState<
    | null
    | { phase: "approving" }
    | { phase: "scanning" }
    | { phase: "done"; orderNumber: string | null }
    | { phase: "error"; error: string }
  >(null);
  const [approvePending, startApprove] = useTransition();
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const secondsLeft = useCountdown(req.createdAt);
  const boundUpdate = useMemo(() => updateOrderRequest.bind(null, req.id), [req.id]);
  const [editState, editAction] = useActionState(boundUpdate, EMPTY_FORM_STATE);

  function handleApproveWithScan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startApprove(async () => {
      setApproveState({ phase: "approving" });
      const result = await approveOrderRequest(req.id);
      if (!result.orderId) {
        setApproveState({ phase: "error", error: "Could not create order." });
        return;
      }
      const file = fd.get("receipt");
      if (file instanceof File && file.size > 0) {
        setApproveState({ phase: "scanning" });
        const scanFd = new FormData();
        scanFd.set("receipt", file);
        const scanResult = await scanReceiptForOrder(result.orderId, scanFd);
        if (!scanResult.ok) {
          setApproveState({ phase: "error", error: scanResult.error });
          return;
        }
        setApproveState({ phase: "done", orderNumber: scanResult.orderNumber });
      } else {
        setApproveState({ phase: "done", orderNumber: null });
      }
    });
  }

  useEffect(() => {
    if (editState.success) setEditing(false);
  }, [editState.success]);

  const canEdit = !isAdmin && req.status === "PENDING" && secondsLeft > 0;

  if (editing) {
    return (
      <div className="space-y-4 rounded-xl border border-black/15 bg-white/95 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-black dark:text-white">Edit Request</p>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left</span>
        </div>
        {editState.error ? <FormMessage tone="error" message={editState.error} /> : null}
        <form action={editAction} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Title <span className="text-red-500">*</span>
            </span>
            <input
              name="title"
              defaultValue={editState.submittedValues.title ?? req.title}
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {editState.fieldErrors.title ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.title}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Description</span>
            <textarea
              name="description"
              defaultValue={editState.submittedValues.description ?? req.description ?? ""}
              rows={2}
              className="w-full resize-none rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Requester Name <span className="text-red-500">*</span>
            </span>
            <input
              name="requesterName"
              defaultValue={editState.submittedValues.requesterName ?? req.requesterName}
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {editState.fieldErrors.requesterName ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.requesterName}</p>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Vendor</span>
              <input
                name="vendor"
                defaultValue={editState.submittedValues.vendor ?? req.vendor ?? ""}
                className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
                Category <span className="text-red-500">*</span>
              </span>
              <CustomSelect
                name="category"
                defaultValue={editState.submittedValues.category ?? req.category}
                options={[
                  { value: "", label: "Select category" },
                  ...ORDER_CATEGORIES.map((c) => ({ value: c, label: ORDER_CATEGORY_LABELS[c] })),
                ]}
              />
              {editState.fieldErrors.category ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.category}</p>
              ) : null}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Quantity</span>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={editState.submittedValues.quantity ?? req.quantity ?? ""}
                className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              />
            </label>
            <div>
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Priority</span>
              <PriorityStarsInput name="priority" defaultValue={req.priority} />
            </div>
          </div>

          {/* Preserve orderUrl through edit */}
          <input type="hidden" name="orderUrl" value={req.orderUrl ?? ""} />

          <div className="flex gap-2 pt-1">
            <SubmitButton idleLabel="Save Changes" />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-black dark:text-white">{req.title}</p>
          <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {req.requesterName} · {ORDER_CATEGORY_LABELS[req.category as OrderCategory] ?? req.category}
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {req.description ? (
        <p className="text-sm text-black/70 dark:text-white/70">{req.description}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-xs text-black/60 dark:text-white/60">
        {req.vendor ? <p><span className="font-medium">Vendor:</span> {req.vendor}</p> : null}
        {req.quantity ? <p><span className="font-medium">Qty:</span> {req.quantity}</p> : null}
        <p><span className="font-medium">Priority:</span> {"★".repeat(req.priority)}{"☆".repeat(5 - req.priority)}</p>
      </div>

      {req.orderUrl ? (
        <a
          href={req.orderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-black/60 underline underline-offset-2 hover:no-underline dark:text-white/60"
        >
          View order link ↗
        </a>
      ) : null}

      <p className="text-xs text-black/40 dark:text-white/40">
        Submitted{" "}
        {new Date(req.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {isAdmin ? (
        <div className="border-t border-black/10 pt-3 dark:border-white/10">
          {/* Done state after approve+scan */}
          {approveState?.phase === "done" ? (
            <div className="space-y-1">
              <p className="text-xs text-green-700 dark:text-green-400">
                ✓ Order created as <span className="font-semibold">Yet to be Placed</span>.
                {approveState.orderNumber
                  ? <> Order number <span className="font-semibold">{approveState.orderNumber}</span> applied — moved to <span className="font-semibold">New</span>.</>
                  : " Upload a receipt from the Queue page to mark it as ordered."}
              </p>
            </div>
          ) : approveState?.phase === "error" ? (
            <div className="space-y-2">
              <p className="text-xs text-red-600 dark:text-red-400">Error: {approveState.error}</p>
              <button type="button" onClick={() => setApproveState(null)} className="text-xs text-red-600/70 underline dark:text-red-400/70">Try again</button>
            </div>
          ) : rejecting ? (
            <form action={rejectOrderRequest.bind(null, req.id)} className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                  Rejection reason <span className="text-black/40 dark:text-white/40">(optional)</span>
                </span>
                <textarea
                  name="reason"
                  rows={2}
                  autoFocus
                  placeholder="e.g. Out of budget, duplicate request…"
                  className="w-full resize-none rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-white/40 dark:focus:ring-white/10"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Confirm Reject
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : approveScanOpen ? (
            <form onSubmit={handleApproveWithScan} className="space-y-3">
              <p className="text-xs text-black/60 dark:text-white/60">
                Optionally attach the receipt now to auto-fill the order number and mark it as ordered.
              </p>
              <input
                ref={receiptFileRef}
                type="file"
                name="receipt"
                accept="image/*,application/pdf"
                className="block w-full text-xs text-black/70 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-black/70 hover:file:bg-zinc-200 dark:text-white/70 dark:file:bg-white/10 dark:file:text-white/70"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={approvePending}
                  className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/85"
                >
                  {approveState?.phase === "approving"
                    ? "Creating order…"
                    : approveState?.phase === "scanning"
                    ? "Scanning receipt…"
                    : "Approve & Apply Receipt"}
                </button>
                <button
                  type="button"
                  onClick={() => setApproveScanOpen(false)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form action={approveOrderRequestForm.bind(null, req.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                >
                  Approve → Create Order
                </button>
              </form>
              <button
                type="button"
                onClick={() => setApproveScanOpen(true)}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                📄 Approve + Scan Receipt
              </button>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Edit
          </button>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left to edit</span>
        </div>
      ) : req.status === "REJECTED" && req.rejectionReason ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/20 dark:bg-red-900/10">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection reason</p>
          <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">{req.rejectionReason}</p>
        </div>
      ) : null}
    </div>
  );
}

function TrackingRequestCard({
  req,
  isAdmin,
}: {
  req: SerializedTrackingRequest;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedType, setSelectedType] = useState<ManuRequestType>(
    (req.type as ManuRequestType) || "CNC",
  );
  const secondsLeft = useCountdown(req.createdAt);
  const boundUpdate = useMemo(() => updateTrackingRequest.bind(null, req.id), [req.id]);
  const [editState, editAction] = useActionState(boundUpdate, EMPTY_FORM_STATE);

  useEffect(() => {
    if (editState.success) setEditing(false);
  }, [editState.success]);

  const canEdit = !isAdmin && req.status === "PENDING" && secondsLeft > 0;
  const typeLabel =
    req.type === "OTHER" && req.otherType
      ? req.otherType
      : TYPE_LABELS[req.type as ManuRequestType] ?? req.type;

  if (editing) {
    return (
      <div className="space-y-4 rounded-xl border border-black/15 bg-white/95 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-black dark:text-white">Edit Request</p>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left</span>
        </div>
        {editState.error ? <FormMessage tone="error" message={editState.error} /> : null}
        <form action={editAction} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Title <span className="text-red-500">*</span>
            </span>
            <input
              name="title"
              defaultValue={editState.submittedValues.title ?? req.title}
              className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
            {editState.fieldErrors.title ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.title}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">Description</span>
            <textarea
              name="description"
              defaultValue={editState.submittedValues.description ?? req.description ?? ""}
              rows={2}
              className="w-full resize-none rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Type <span className="text-red-500">*</span>
            </span>
            <CustomSelect
              name="type"
              value={selectedType}
              onChange={(v) => setSelectedType(v as ManuRequestType)}
              options={[
                { value: "CNC", label: "CNC" },
                { value: "DRILL", label: "Drill" },
                { value: "TAP", label: "Tap" },
                { value: "CUT", label: "Cut" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            {editState.fieldErrors.type ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.type}</p>
            ) : null}
          </label>

          {selectedType === "OTHER" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
                Describe the type <span className="text-red-500">*</span>
              </span>
              <input
                name="otherType"
                defaultValue={editState.submittedValues.otherType ?? req.otherType ?? ""}
                className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {editState.fieldErrors.otherType ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.otherType}</p>
              ) : null}
            </label>
          ) : null}

          <div className="flex gap-2 pt-1">
            <SubmitButton idleLabel="Save Changes" />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-black dark:text-white">{req.title}</p>
          <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">{typeLabel}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {req.description ? (
        <p className="text-sm text-black/70 dark:text-white/70">{req.description}</p>
      ) : null}

      <p className="text-xs text-black/40 dark:text-white/40">
        Submitted{" "}
        {new Date(req.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {isAdmin ? (
        <div className="border-t border-black/10 pt-3 dark:border-white/10">
          {rejecting ? (
            <form action={rejectTrackingRequest.bind(null, req.id)} className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70 dark:text-white/70">
                  Rejection reason <span className="text-black/40 dark:text-white/40">(optional)</span>
                </span>
                <textarea
                  name="reason"
                  rows={2}
                  autoFocus
                  placeholder="e.g. Already covered, not needed right now…"
                  className="w-full resize-none rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder-white/40 dark:focus:border-white/40 dark:focus:ring-white/10"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Confirm Reject
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <form action={approveTrackingRequest.bind(null, req.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                >
                  Approve → Add to Tracking
                </button>
              </form>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Edit
          </button>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left to edit</span>
        </div>
      ) : req.status === "REJECTED" && req.rejectionReason ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/20 dark:bg-red-900/10">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection reason</p>
          <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">{req.rejectionReason}</p>
        </div>
      ) : null}
    </div>
  );
}

const STATUS_TOAST_KEY = "mq:viewer:notifiedStatuses";

type StatusToastMessage = {
  tone: "approved" | "rejected" | "mixed";
  approved: number;
  rejected: number;
};

function useViewerStatusToast(
  orderRequests: SerializedOrderRequest[],
  trackingRequests: SerializedTrackingRequest[],
) {
  const [toast, setToast] = useState<StatusToastMessage | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STATUS_TOAST_KEY);
    const notified: Record<string, string> = stored ? (JSON.parse(stored) as Record<string, string>) : {};

    const all = [
      ...orderRequests.map((r) => ({ id: r.id, status: r.status as string })),
      ...trackingRequests.map((r) => ({ id: r.id, status: r.status as string })),
    ];

    let approved = 0;
    let rejected = 0;

    for (const req of all) {
      if (
        (req.status === "APPROVED" || req.status === "REJECTED") &&
        notified[req.id] !== req.status
      ) {
        if (req.status === "APPROVED") approved++;
        else rejected++;
        notified[req.id] = req.status;
      }
    }

    if (approved > 0 || rejected > 0) {
      localStorage.setItem(STATUS_TOAST_KEY, JSON.stringify(notified));
      const tone = approved > 0 && rejected > 0 ? "mixed" : approved > 0 ? "approved" : "rejected";
      setToast({ tone, approved, rejected });
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => setToast(null), []);
  return { toast, dismiss };
}

function ViewerStatusToast({
  orderRequests,
  trackingRequests,
}: {
  orderRequests: SerializedOrderRequest[];
  trackingRequests: SerializedTrackingRequest[];
}) {
  const { toast, dismiss } = useViewerStatusToast(orderRequests, trackingRequests);
  if (!toast) return null;

  const { tone, approved, rejected } = toast;
  const total = approved + rejected;

  let text = "";
  if (tone === "approved") {
    text = `${total} request${total === 1 ? "" : "s"} approved ✓`;
  } else if (tone === "rejected") {
    text = `${total} request${total === 1 ? "" : "s"} rejected`;
  } else {
    text = `${approved} approved, ${rejected} rejected`;
  }

  const borderCls =
    tone === "approved"
      ? "border-green-200 dark:border-green-500/30"
      : tone === "rejected"
        ? "border-red-200 dark:border-red-500/30"
        : "border-black/15 dark:border-white/15";

  const textCls =
    tone === "approved"
      ? "text-green-900 dark:text-green-200"
      : tone === "rejected"
        ? "text-red-900 dark:text-red-200"
        : "text-black dark:text-white";

  const barCls =
    tone === "approved"
      ? "bg-green-500 dark:bg-green-400"
      : tone === "rejected"
        ? "bg-red-500 dark:bg-red-400"
        : "bg-black dark:bg-white";

  const trackCls =
    tone === "approved"
      ? "bg-green-100 dark:bg-green-900/40"
      : tone === "rejected"
        ? "bg-red-100 dark:bg-red-900/40"
        : "bg-black/10 dark:bg-white/10";

  return (
    <div
      className={`fixed right-3 top-3 z-50 max-w-xs overflow-hidden rounded-xl border bg-white shadow-lg dark:bg-zinc-900 ${borderCls}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className={`text-sm font-medium ${textCls}`}>{text}</p>
        <button
          onClick={dismiss}
          className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className={`h-0.5 ${trackCls}`}>
        <div
          className={`h-full origin-left ${barCls}`}
          style={{ animation: "toast-drain 5s linear forwards" }}
        />
      </div>
    </div>
  );
}

type Props = {
  isAdmin: boolean;
  orderRequests: SerializedOrderRequest[];
  trackingRequests: SerializedTrackingRequest[];
};

export function RequestsClient({ isAdmin, orderRequests, trackingRequests }: Props) {
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const [showOrderForm, setShowOrderForm] = useState(openParam === "order");
  const [showTrackingForm, setShowTrackingForm] = useState(openParam === "tracking");

  const totalCount = orderRequests.length + trackingRequests.length;

  return (
    <section className="space-y-6">
      {!isAdmin ? (
        <ViewerStatusToast orderRequests={orderRequests} trackingRequests={trackingRequests} />
      ) : null}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
          {isAdmin ? "Pending Requests" : "My Requests"}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {isAdmin
            ? totalCount === 0
              ? "No pending requests."
              : `${totalCount} request${totalCount === 1 ? "" : "s"} awaiting review.`
            : "Submit and track your part and tracking requests."}
        </p>
      </header>

      {/* Expandable new-request panels (viewer only) */}
      {!isAdmin ? (
        <div className="space-y-2">
          {/* Request a Part */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={() => {
                setShowOrderForm((v) => !v);
                if (showTrackingForm) setShowTrackingForm(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <span className="font-semibold text-black dark:text-white">Request a Part</span>
              <span
                className="text-lg font-light leading-none text-black/40 transition-transform duration-200 dark:text-white/40"
                style={{ transform: showOrderForm ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: showOrderForm ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-zinc-200 px-4 pb-5 pt-4 dark:border-white/10">
                  <NewOrderRequestForm
                    onSuccess={() => setShowOrderForm(false)}
                    onCancel={() => setShowOrderForm(false)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Request Tracking */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={() => {
                setShowTrackingForm((v) => !v);
                if (showOrderForm) setShowOrderForm(false);
              }}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
            >
              <span className="font-semibold text-black dark:text-white">Request Tracking</span>
              <span
                className="text-lg font-light leading-none text-black/40 transition-transform duration-200 dark:text-white/40"
                style={{ transform: showTrackingForm ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: showTrackingForm ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-zinc-200 px-4 pb-5 pt-4 dark:border-white/10">
                  <NewTrackingRequestForm
                    onSuccess={() => setShowTrackingForm(false)}
                    onCancel={() => setShowTrackingForm(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Part Requests list */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-black/80 dark:text-white/80">Part Requests</h2>
        {orderRequests.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white/95 p-5 text-sm text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            {isAdmin ? "No pending part requests." : "No part requests yet."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {orderRequests.map((req) => (
              <OrderRequestCard key={req.id} req={req} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>

      {/* Tracking Requests list */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-black/80 dark:text-white/80">Tracking Requests</h2>
        {trackingRequests.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white/95 p-5 text-sm text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            {isAdmin ? "No pending tracking requests." : "No tracking requests yet."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {trackingRequests.map((req) => (
              <TrackingRequestCard key={req.id} req={req} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

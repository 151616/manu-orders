"use client";

import { useState, useEffect, useActionState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NewOrderRequestForm } from "@/app/requests/new-order/new-order-request-form";
import { NewTrackingRequestForm } from "@/app/requests/new-tracking/new-tracking-request-form";
import {
  updateOrderRequest,
  updateTrackingRequest,
  approveOrderRequest,
  rejectOrderRequest,
  approveTrackingRequest,
  rejectTrackingRequest,
} from "@/app/requests/actions";
import { ORDER_CATEGORIES, ORDER_CATEGORY_LABELS } from "@/lib/order-domain";
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
  title: string;
  description: string | null;
  type: string;
  otherType: string | null;
};

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "PENDING") {
    return (
      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        Pending
      </span>
    );
  }
  if (status === "APPROVED") {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
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
  const secondsLeft = useCountdown(req.createdAt);
  const boundUpdate = useMemo(() => updateOrderRequest.bind(null, req.id), [req.id]);
  const [editState, editAction] = useActionState(boundUpdate, EMPTY_FORM_STATE);

  useEffect(() => {
    if (editState.success) setEditing(false);
  }, [editState.success]);

  const canEdit = !isAdmin && req.status === "PENDING" && secondsLeft > 0;

  if (editing) {
    return (
      <div className="space-y-4 rounded-xl border border-indigo-200 bg-white/95 p-4 shadow-sm dark:border-indigo-500/30 dark:bg-white/5">
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
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
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
              className="w-full resize-none rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Requester Name <span className="text-red-500">*</span>
            </span>
            <input
              name="requesterName"
              defaultValue={editState.submittedValues.requesterName ?? req.requesterName}
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
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
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
                Category <span className="text-red-500">*</span>
              </span>
              <select
                name="category"
                defaultValue={editState.submittedValues.category ?? req.category}
                className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              >
                <option value="">Select category</option>
                {ORDER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{ORDER_CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
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
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
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
            <SubmitButton>Save Changes</SubmitButton>
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
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
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
          className="inline-block text-xs text-indigo-600 underline underline-offset-2 hover:no-underline dark:text-indigo-400"
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
        <div className="flex gap-2 border-t border-black/10 pt-3 dark:border-white/10">
          <form action={approveOrderRequest.bind(null, req.id)}>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              Approve → Create Order
            </button>
          </form>
          <form action={rejectOrderRequest.bind(null, req.id)}>
            <button
              type="submit"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Reject
            </button>
          </form>
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Edit
          </button>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left to edit</span>
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
      <div className="space-y-4 rounded-xl border border-indigo-200 bg-white/95 p-4 shadow-sm dark:border-indigo-500/30 dark:bg-white/5">
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
              className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
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
              className="w-full resize-none rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80">
              Type <span className="text-red-500">*</span>
            </span>
            <select
              name="type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ManuRequestType)}
              className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
            >
              <option value="CNC">CNC</option>
              <option value="DRILL">Drill</option>
              <option value="TAP">Tap</option>
              <option value="CUT">Cut</option>
              <option value="OTHER">Other</option>
            </select>
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
                className="w-full rounded-md border border-slate-300/80 px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
              />
              {editState.fieldErrors.otherType ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editState.fieldErrors.otherType}</p>
              ) : null}
            </label>
          ) : null}

          <div className="flex gap-2 pt-1">
            <SubmitButton>Save Changes</SubmitButton>
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
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
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
        <div className="flex gap-2 border-t border-black/10 pt-3 dark:border-white/10">
          <form action={approveTrackingRequest.bind(null, req.id)}>
            <button
              type="submit"
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              Approve → Add to Tracking
            </button>
          </form>
          <form action={rejectTrackingRequest.bind(null, req.id)}>
            <button
              type="submit"
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Reject
            </button>
          </form>
        </div>
      ) : canEdit ? (
        <div className="flex items-center gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Edit
          </button>
          <span className="text-xs text-black/40 dark:text-white/40">{secondsLeft}s left to edit</span>
        </div>
      ) : null}
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
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
                <div className="border-t border-slate-200 px-4 pb-5 pt-4 dark:border-white/10">
                  <NewOrderRequestForm
                    onSuccess={() => setShowOrderForm(false)}
                    onCancel={() => setShowOrderForm(false)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Request Tracking */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm dark:border-white/10 dark:bg-white/5">
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
                <div className="border-t border-slate-200 px-4 pb-5 pt-4 dark:border-white/10">
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
          <p className="rounded-xl border border-slate-200 bg-white/95 p-5 text-sm text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
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
          <p className="rounded-xl border border-slate-200 bg-white/95 p-5 text-sm text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
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

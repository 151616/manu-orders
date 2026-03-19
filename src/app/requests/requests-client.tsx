"use client";

import { useState } from "react";
import {
  approveOrderRequestForm,
  rejectOrderRequest,
  approveTrackingRequest,
  rejectTrackingRequest,
  type SerializedOrderRequest,
  type SerializedTrackingRequest,
} from "@/app/requests/actions";
import { ORDER_CATEGORY_LABELS, ROBOT_LABELS, type OrderCategory, type Robot } from "@/lib/order-domain";

type Props = {
  orderRequests: SerializedOrderRequest[];
  trackingRequests: SerializedTrackingRequest[];
  isAdmin: boolean;
  userId: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const TRACKING_TYPE_LABELS: Record<string, string> = {
  CNC: "CNC",
  DRILL: "Drill",
  TAP: "Tap",
  CUT: "Cut",
  OTHER: "Other",
};

type Tab = "orders" | "tracking";

export function RequestsClient({
  orderRequests,
  trackingRequests,
  isAdmin,
  userId,
}: Props) {
  const [tab, setTab] = useState<Tab>("orders");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const pendingOrderCount = orderRequests.filter(
    (r) => r.status === "PENDING",
  ).length;
  const pendingTrackingCount = trackingRequests.filter(
    (r) => r.status === "PENDING",
  ).length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-zinc-200/80 bg-white/95 p-1 dark:border-white/10 dark:bg-white/5">
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            tab === "orders"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
          }`}
        >
          Order Requests
          {pendingOrderCount > 0 ? (
            <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {pendingOrderCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab("tracking")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            tab === "tracking"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
          }`}
        >
          Tracking Requests
          {pendingTrackingCount > 0 ? (
            <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {pendingTrackingCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Order requests tab */}
      {tab === "orders" ? (
        orderRequests.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white/95 p-6 text-sm text-black/50 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/50">
            No order requests yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {orderRequests.map((req) => (
              <article
                key={req.id}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-black dark:text-white">
                      {req.title}
                    </h3>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      by {req.submittedByLabel.split(":").pop()} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[req.status] ?? ""}`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-black/60 dark:text-white/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                      Category
                    </span>
                    <p>
                      {ORDER_CATEGORY_LABELS[req.category as OrderCategory] ??
                        req.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                      Vendor
                    </span>
                    <p>{req.vendor ?? "N/A"}</p>
                  </div>
                  {req.quantity ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                        Qty
                      </span>
                      <p>{req.quantity}</p>
                    </div>
                  ) : null}
                  {req.robot ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                        Robot
                      </span>
                      <p>{ROBOT_LABELS[req.robot as Robot] ?? req.robot}</p>
                    </div>
                  ) : null}
                </div>

                {req.description ? (
                  <p className="text-xs text-black/60 dark:text-white/60">
                    {req.description}
                  </p>
                ) : null}

                {req.rejectionReason ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Rejected: {req.rejectionReason}
                  </p>
                ) : null}

                {/* Admin actions for pending requests */}
                {isAdmin && req.status === "PENDING" ? (
                  <div className="border-t border-black/10 pt-3 dark:border-white/10">
                    {rejectingId === req.id ? (
                      <form
                        action={rejectOrderRequest.bind(null, req.id)}
                        className="space-y-2"
                      >
                        <input
                          name="reason"
                          placeholder="Reason for rejection (optional)"
                          className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-2">
                        <form
                          action={approveOrderRequestForm.bind(null, req.id)}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                          >
                            Approve
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )
      ) : null}

      {/* Tracking requests tab */}
      {tab === "tracking" ? (
        trackingRequests.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white/95 p-6 text-sm text-black/50 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/50">
            No tracking requests yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {trackingRequests.map((req) => (
              <article
                key={req.id}
                className="space-y-3 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-black dark:text-white">
                      {req.title}
                    </h3>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      by {req.submittedByLabel.split(":").pop()} ·{" "}
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[req.status] ?? ""}`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-black/60 dark:text-white/60">
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                      Type
                    </span>
                    <p>
                      {req.type === "OTHER" && req.otherType
                        ? req.otherType
                        : TRACKING_TYPE_LABELS[req.type] ?? req.type}
                    </p>
                  </div>
                  {req.robot ? (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                        Robot
                      </span>
                      <p>{ROBOT_LABELS[req.robot as Robot] ?? req.robot}</p>
                    </div>
                  ) : null}
                </div>

                {req.description ? (
                  <p className="text-xs text-black/60 dark:text-white/60">
                    {req.description}
                  </p>
                ) : null}

                {req.rejectionReason ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Rejected: {req.rejectionReason}
                  </p>
                ) : null}

                {isAdmin && req.status === "PENDING" ? (
                  <div className="border-t border-black/10 pt-3 dark:border-white/10">
                    {rejectingId === req.id ? (
                      <form
                        action={rejectTrackingRequest.bind(null, req.id)}
                        className="space-y-2"
                      >
                        <input
                          name="reason"
                          placeholder="Reason for rejection (optional)"
                          className="w-full rounded-md border border-zinc-300/80 px-3 py-2 text-sm text-black outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="rounded-lg border border-black/20 px-3 py-1.5 text-xs font-semibold text-black/60 hover:bg-black/5 dark:border-white/20 dark:text-white/60 dark:hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex gap-2">
                        <form
                          action={approveTrackingRequest.bind(null, req.id)}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
                          >
                            Approve
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setRejectingId(req.id)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

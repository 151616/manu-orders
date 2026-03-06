import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteOrderAttachment,
  getOrderById,
  listOrderAttachments,
  listOrderActivities,
  removeOrderFromList,
} from "@/app/orders/actions";
import { OrderAttachmentUploadForm } from "@/app/orders/[id]/order-attachment-upload-form";
import { ManufacturingOrderForm } from "@/app/orders/[id]/manufacturing-order-form";
import { RequesterOrderForm } from "@/app/orders/[id]/requester-order-form";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsDisplay } from "@/components/priority-stars-display";
import { StatusBadge } from "@/components/status-badge";
import { requireAuth } from "@/lib/auth";
import { getEtaDeltaDays, getRemainingEtaDays } from "@/lib/eta";
import { ORDER_CATEGORY_LABELS, type OrderCategory } from "@/lib/order-domain";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageMessage(saved: string | undefined) {
  if (saved === "created") {
    return { tone: "success" as const, message: "Order created successfully." };
  }
  if (saved === "requester") {
    return { tone: "success" as const, message: "Requester fields updated." };
  }
  if (saved === "manufacturing") {
    return { tone: "success" as const, message: "Manufacturing fields updated." };
  }
  if (saved === "attachment-uploaded") {
    return { tone: "success" as const, message: "Attachment uploaded." };
  }
  if (saved === "attachment-deleted") {
    return { tone: "success" as const, message: "Attachment removed." };
  }
  if (saved === "attachment-not-found") {
    return { tone: "error" as const, message: "Attachment not found." };
  }
  if (saved === "attachment-failed") {
    return {
      tone: "error" as const,
      message: "We could not process your request. Please try again.",
    };
  }
  return null;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kib = sizeBytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KB`;
  }

  const mib = kib / 1024;
  return `${mib.toFixed(1)} MB`;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const order = await getOrderById(id);
  const activities = await listOrderActivities(id);
  const attachments = await listOrderAttachments(id);

  if (!order) {
    notFound();
  }

  const saved = first((await searchParams).saved);
  const message = pageMessage(saved);
  const canMutate = user.role === "ADMIN";
  const etaRemaining = getRemainingEtaDays(order);
  const etaDelta = getEtaDeltaDays(order);
  const isTerminal = order.status === "DONE" || order.status === "CANCELLED";
  const isOverdue = !isTerminal && etaDelta < 0;
  const isDueSoon = !isTerminal && etaDelta >= 0 && etaDelta <= 2;
  const removeAction = removeOrderFromList.bind(null, order.id);

  return (
    <section className="space-y-4 sm:space-y-5">
      {message ? <FormMessage tone={message.tone} message={message.message} /> : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">
              Order Detail
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-black">{order.title}</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {isOverdue ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                OVERDUE
              </span>
            ) : null}
            {isDueSoon ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                DUE SOON
              </span>
            ) : null}
            <StatusBadge status={order.status} />
            {canMutate ? (
              <form action={removeAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
                >
                  Move to Trash
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Priority</p>
            <PriorityStarsDisplay value={order.priority} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">ETA</p>
            {isOverdue ? (
              <p className="text-sm font-medium text-red-700">
                Overdue by {Math.abs(etaDelta)} day(s)
              </p>
            ) : isDueSoon ? (
              <p className="text-sm font-medium text-amber-800">
                Due in {etaRemaining} day(s)
              </p>
            ) : (
              <p className="text-sm text-black/80">{etaRemaining} day(s)</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Category</p>
            <p className="text-sm text-black/80">
              {ORDER_CATEGORY_LABELS[order.category as OrderCategory] ?? order.category}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Quantity</p>
            <p className="text-sm text-black/80">{order.quantity ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Order Number</p>
            <p className="text-sm text-black/80">{order.orderNumber ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Requester</p>
            <p className="text-sm text-black/80">{order.requesterName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Vendor</p>
            <p className="text-sm text-black/80">{order.vendor ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Created</p>
            <p className="text-sm text-black/80">
              {order.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Updated</p>
            <p className="text-sm text-black/80">
              {order.updatedAt.toLocaleDateString()}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-black/50">Order URL</p>
            {order.orderUrl ? (
              <a
                href={order.orderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                {order.orderUrl}
              </a>
            ) : (
              <p className="truncate text-sm text-black/80">N/A</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-black/50">Order ID</p>
            <p className="truncate text-sm text-black/80">{order.id}</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-black/50">Description</p>
          <p className="text-sm text-black/80">{order.description ?? "N/A"}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-black/50">
            Manufacturing Notes
          </p>
          <p className="text-sm text-black/80">{order.notesFromManu ?? "N/A"}</p>
        </div>

        {order.orderUrl ? (
          <Link
            href={order.orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full justify-center rounded-lg border border-black/20 px-4 py-2 text-sm font-semibold text-black hover:bg-black/5 sm:w-auto"
          >
            Open Vendor Link
          </Link>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-black">Attachments</h2>
          <p className="text-sm text-black/70">
            Quotes, drawings, spreadsheets, and other order files.
          </p>
        </div>

        {canMutate ? <OrderAttachmentUploadForm orderId={order.id} /> : null}

        {attachments.length === 0 ? (
          <p className="text-sm text-black/70">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((attachment) => {
              const deleteAction = deleteOrderAttachment.bind(
                null,
                order.id,
                attachment.id,
              );
              const attachmentHref =
                attachment.publicUrl ||
                (attachment.storagePath.startsWith("/")
                  ? attachment.storagePath
                  : null);

              return (
                <li
                  key={attachment.id}
                  className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    {attachmentHref ? (
                      <a
                        href={attachmentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                      >
                        {attachment.originalName}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium text-black/80">
                        {attachment.originalName}
                      </p>
                    )}
                    <p className="text-xs text-black/60">
                      {formatFileSize(attachment.sizeBytes)} -{" "}
                      {attachment.createdAt.toLocaleString()}
                    </p>
                  </div>

                  {canMutate ? (
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
                      >
                        Delete
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canMutate ? (
        <RequesterOrderForm order={order} />
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-black">Requester Fields</h2>
          <p className="text-sm text-black/70">
            This section is read-only for VIEWER users.
          </p>
        </div>
      )}

      {canMutate ? (
        <ManufacturingOrderForm order={order} defaultEtaDays={etaRemaining} />
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-black">Manufacturing Fields</h2>
          <p className="text-sm text-black/70">
            Priority, ETA, status, and manufacturing notes are read-only for VIEWER users.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-black">Activity</h2>

        {activities.length === 0 ? (
          <p className="text-sm text-black/70">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
              >
                <p className="text-xs text-black/60">
                  {activity.at.toLocaleString()} by {activity.role}
                </p>
                <p className="mt-1 text-sm font-medium text-black">
                  {activity.details.summary}
                </p>
                {activity.details.diffs.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {activity.details.diffs.map((diff, index) => (
                      <p key={`${activity.id}-${diff.field}-${index}`} className="text-xs text-black/70">
                        {diff.field}: {diff.from} -&gt; {diff.to}
                      </p>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

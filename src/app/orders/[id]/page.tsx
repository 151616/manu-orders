import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderById,
  listOrderActivities,
  removeOrderFromList,
} from "@/app/orders/actions";
import { ManufacturingOrderForm } from "@/app/orders/[id]/manufacturing-order-form";
import { RequesterOrderForm } from "@/app/orders/[id]/requester-order-form";
import { FormMessage } from "@/components/form-message";
import { PriorityStarsDisplay } from "@/components/priority-stars-display";
import { StatusBadge } from "@/components/status-badge";
import { requireAuth } from "@/lib/auth";
import { getRemainingEtaDays } from "@/lib/eta";
import { ORDER_CATEGORY_LABELS } from "@/lib/order-domain";

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

function successMessage(saved: string | undefined) {
  if (saved === "created") return "Order created successfully.";
  if (saved === "requester") return "Requester fields updated.";
  if (saved === "manufacturing") return "Manufacturing fields updated.";
  return null;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const order = await getOrderById(id);
  const activities = await listOrderActivities(id);

  if (!order) {
    notFound();
  }

  const saved = first((await searchParams).saved);
  const message = successMessage(saved);
  const canMutate = user.role === "ADMIN";
  const etaRemaining = getRemainingEtaDays(order);
  const removeAction = removeOrderFromList.bind(null, order.id);

  return (
    <section className="space-y-4">
      {message ? <FormMessage tone="success" message={message} /> : null}

      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">
              Order Detail
            </p>
            <h1 className="text-2xl font-semibold text-black">{order.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            {canMutate ? (
              <form action={removeAction}>
                <button
                  type="submit"
                  className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
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
            <p className="text-sm text-black/80">{etaRemaining} day(s)</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Category</p>
            <p className="text-sm text-black/80">{ORDER_CATEGORY_LABELS[order.category]}</p>
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
            <p className="text-xs uppercase tracking-wide text-black/50">
              Requester Contact
            </p>
            <p className="text-sm text-black/80">{order.requesterContact ?? "N/A"}</p>
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
                className="truncate text-sm text-blue-700 underline underline-offset-2 hover:text-blue-900"
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
            className="inline-flex rounded-md border border-black/20 px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
          >
            Open Vendor Link
          </Link>
        ) : null}
      </div>

      {canMutate ? (
        <RequesterOrderForm order={order} />
      ) : (
        <div className="space-y-2 rounded-lg border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-black">Requester Fields</h2>
          <p className="text-sm text-black/70">
            This section is read-only for VIEWER users.
          </p>
        </div>
      )}

      {canMutate ? (
        <ManufacturingOrderForm order={order} defaultEtaDays={etaRemaining} />
      ) : (
        <div className="space-y-2 rounded-lg border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-black">Manufacturing Fields</h2>
          <p className="text-sm text-black/70">
            Priority, ETA, status, and manufacturing notes are read-only for VIEWER users.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold text-black">Activity</h2>

        {activities.length === 0 ? (
          <p className="text-sm text-black/70">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-md border border-black/10 bg-slate-50 p-3"
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

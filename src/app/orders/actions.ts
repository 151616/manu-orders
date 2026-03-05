"use server";

import { OrderCategory, OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireManufacturing } from "@/lib/auth";
import {
  FormActionState,
  getNullableTrimmedString,
  getOptionalInt,
  getTrimmedString,
  toFieldErrors,
} from "@/lib/form-utils";
import { ORDER_STATUS_SORT_ORDER, ORDER_STATUSES } from "@/lib/order-domain";
import {
  OrderCreateSchema,
  OrderManufacturingUpdateSchema,
  OrderRequesterUpdateSchema,
} from "@/lib/schemas";
import { addDays } from "@/lib/eta";
import { prisma } from "@/lib/prisma";

type ListOrdersInput = {
  search?: string | null;
  status?: OrderStatus | "ALL" | null;
  category?: OrderCategory | "ALL" | null;
};

type ActivityDiff = {
  field: string;
  from: string;
  to: string;
};

type ActivityDetails = {
  summary: string;
  diffs: ActivityDiff[];
};

type OrderActivityFeedItem = {
  id: string;
  action: string;
  createdAt: Date;
  userName: string;
  details: ActivityDetails;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  vendor: "Vendor",
  orderNumber: "Order Number",
  orderUrl: "Order URL",
  quantity: "Quantity",
  category: "Category",
  requesterName: "Requester Name",
  requesterContact: "Requester Contact",
  priority: "Priority",
  etaDays: "ETA Days",
  status: "Status",
  notesFromManu: "Manufacturing Notes",
};

function parseRequesterFields(formData: FormData) {
  return OrderRequesterUpdateSchema.safeParse({
    title: getTrimmedString(formData.get("title")),
    description: getNullableTrimmedString(formData.get("description")),
    vendor: getNullableTrimmedString(formData.get("vendor")),
    orderNumber: getNullableTrimmedString(formData.get("orderNumber")),
    orderUrl: getNullableTrimmedString(formData.get("orderUrl")),
    quantity: getOptionalInt(formData.get("quantity")),
    category: getTrimmedString(formData.get("category")),
    requesterName: getTrimmedString(formData.get("requesterName")),
    requesterContact: getNullableTrimmedString(formData.get("requesterContact")),
  });
}

function parseManufacturingFields(formData: FormData) {
  return OrderManufacturingUpdateSchema.safeParse({
    priority: getOptionalInt(formData.get("priority")),
    etaDays: getOptionalInt(formData.get("etaDays")),
    status: getTrimmedString(formData.get("status")),
    notesFromManu: getNullableTrimmedString(formData.get("notesFromManu")),
  });
}

async function requireManufacturingUserOrNull() {
  try {
    return await requireManufacturing();
  } catch {
    return null;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

function buildDiffs(
  previousValues: Record<string, unknown>,
  nextValues: Record<string, unknown>,
): ActivityDiff[] {
  const diffs: ActivityDiff[] = [];

  Object.entries(nextValues).forEach(([key, nextValue]) => {
    const previousValue = previousValues[key];
    if (previousValue === nextValue) {
      return;
    }

    diffs.push({
      field: key,
      from: formatValue(previousValue),
      to: formatValue(nextValue),
    });
  });

  return diffs;
}

function summarizeDiffs(
  diffs: ActivityDiff[],
  fallback: string,
): string {
  if (diffs.length === 0) {
    return fallback;
  }

  return diffs
    .map((diff) => `${FIELD_LABELS[diff.field] ?? diff.field}: ${diff.from} -> ${diff.to}`)
    .join(" | ");
}

async function createOrderActivity({
  orderId,
  actorLabel,
  action,
  summary,
  diffs,
}: {
  orderId: string;
  actorLabel: string;
  action: string;
  summary: string;
  diffs: ActivityDiff[];
}) {
  const details: ActivityDetails = {
    summary,
    diffs,
  };

  await prisma.orderActivity.create({
    data: {
      orderId,
      actorLabel,
      action,
      details: JSON.stringify(details),
    },
  });
}

function parseActivityDetails(rawDetails: string): ActivityDetails {
  try {
    const parsed = JSON.parse(rawDetails) as Partial<ActivityDetails>;
    const diffs = Array.isArray(parsed.diffs)
      ? parsed.diffs.filter(
          (item): item is ActivityDiff =>
            typeof item === "object" &&
            item !== null &&
            typeof item.field === "string" &&
            typeof item.from === "string" &&
            typeof item.to === "string",
        )
      : [];

    return {
      summary:
        typeof parsed.summary === "string" && parsed.summary.length > 0
          ? parsed.summary
          : "Activity recorded.",
      diffs,
    };
  } catch {
    return {
      summary: "Activity recorded.",
      diffs: [],
    };
  }
}

export async function listOrders({
  search,
  status,
  category,
}: ListOrdersInput = {}) {
  await requireAuth();

  const trimmedSearch = search?.trim() ?? "";
  const statusFilter =
    status && status !== "ALL" && ORDER_STATUSES.includes(status)
      ? status
      : undefined;
  const categoryFilter =
    category &&
    category !== "ALL" &&
    Object.values(OrderCategory).includes(category)
      ? category
      : undefined;
  const statusWhere = statusFilter
    ? { status: statusFilter }
    : { status: { not: OrderStatus.CANCELLED } };

  const orders = await prisma.order.findMany({
    where: {
      ...(trimmedSearch
        ? {
            OR: [
              { title: { contains: trimmedSearch } },
              { orderNumber: { contains: trimmedSearch } },
              { requesterName: { contains: trimmedSearch } },
            ],
          }
        : {}),
      ...statusWhere,
      ...(categoryFilter ? { category: categoryFilter } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return orders.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    const statusDelta =
      ORDER_STATUS_SORT_ORDER[a.status] - ORDER_STATUS_SORT_ORDER[b.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export async function getOrderById(orderId: string) {
  await requireAuth();

  if (!orderId) {
    return null;
  }

  return prisma.order.findUnique({
    where: { id: orderId },
  });
}

export async function listOrderActivities(
  orderId: string,
): Promise<OrderActivityFeedItem[]> {
  await requireAuth();

  if (!orderId) {
    return [];
  }

  const activities = await prisma.orderActivity.findMany({
    where: { orderId },
    orderBy: [{ createdAt: "desc" }],
  });

  return activities.map((activity) => ({
    id: activity.id,
    action: activity.action,
    createdAt: activity.createdAt,
    userName: activity.actorLabel,
    details: parseActivityDetails(activity.details),
  }));
}

export async function createOrder(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();
  const initialEtaDays = 10;

  const parsed = OrderCreateSchema.safeParse({
    title: getTrimmedString(formData.get("title")),
    description: getNullableTrimmedString(formData.get("description")),
    vendor: getNullableTrimmedString(formData.get("vendor")),
    orderNumber: getNullableTrimmedString(formData.get("orderNumber")),
    orderUrl: getNullableTrimmedString(formData.get("orderUrl")),
    quantity: getOptionalInt(formData.get("quantity")),
    category: getTrimmedString(formData.get("category")),
    requesterName: getTrimmedString(formData.get("requesterName")),
    requesterContact: getNullableTrimmedString(formData.get("requesterContact")),
  });

  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const created = await prisma.order.create({
    data: {
      ...parsed.data,
      priority: 3,
      etaDays: initialEtaDays,
      etaTargetDate: addDays(new Date(), initialEtaDays),
      status: "NEW",
      createdByLabel: user.label,
    },
  });

  const createDiffs = buildDiffs(
    {
      title: null,
      description: null,
      vendor: null,
      orderNumber: null,
      orderUrl: null,
      quantity: null,
      category: null,
      requesterName: null,
      requesterContact: null,
      priority: null,
      etaDays: null,
      status: null,
      notesFromManu: null,
    },
    {
      title: created.title,
      description: created.description,
      vendor: created.vendor,
      orderNumber: created.orderNumber,
      orderUrl: created.orderUrl,
      quantity: created.quantity,
      category: created.category,
      requesterName: created.requesterName,
      requesterContact: created.requesterContact,
      priority: created.priority,
      etaDays: created.etaDays,
      status: created.status,
      notesFromManu: created.notesFromManu,
    },
  );

  await createOrderActivity({
    orderId: created.id,
    actorLabel: user.label,
    action: "ORDER_CREATED",
    summary: "Order created.",
    diffs: createDiffs,
  });

  revalidatePath("/queue");
  revalidatePath("/orders/new");
  revalidatePath(`/orders/${created.id}`);
  redirect(`/orders/${created.id}?saved=created`);
}

export async function updateOrderRequesterFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    return {
      success: null,
      error: "Order not found.",
      fieldErrors: {},
    };
  }

  const parsed = parseRequesterFields(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const diffs = buildDiffs(existing as unknown as Record<string, unknown>, parsed.data);

  await prisma.order.update({
    where: { id: orderId },
    data: parsed.data,
  });

  await createOrderActivity({
    orderId,
    actorLabel: user.label,
    action: "ORDER_REQUESTER_UPDATED",
    summary: summarizeDiffs(diffs, "Requester fields saved without value changes."),
    diffs,
  });

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?saved=requester`);
}

export async function updateOrderManufacturingFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireManufacturing();

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    return {
      success: null,
      error: "Order not found.",
      fieldErrors: {},
    };
  }

  const parsed = parseManufacturingFields(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const diffs = buildDiffs(existing as unknown as Record<string, unknown>, parsed.data);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...parsed.data,
      etaTargetDate: addDays(new Date(), parsed.data.etaDays),
    },
  });

  await createOrderActivity({
    orderId,
    actorLabel: user.label,
    action: "ORDER_MANUFACTURING_UPDATED",
    summary: summarizeDiffs(
      diffs,
      "Manufacturing fields saved without value changes.",
    ),
    diffs,
  });

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?saved=manufacturing`);
}

export async function removeOrderFromList(orderId: string) {
  const actor = await requireManufacturingUserOrNull();
  if (!actor) {
    redirect("/queue?toast=forbidden&tone=debug");
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing) {
    redirect("/queue?toast=order-not-found&tone=debug");
  }

  if (existing.status === "CANCELLED") {
    redirect("/queue?toast=already-removed&tone=debug");
  }

  const nextStatus = "CANCELLED";
  const diffs = buildDiffs(
    { status: existing.status },
    { status: nextStatus },
  );

  await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
  });

  await createOrderActivity({
    orderId,
    actorLabel: actor.label,
    action: "ORDER_REMOVED_FROM_LIST",
    summary: summarizeDiffs(
      diffs,
      "Order removed from active list.",
    ),
    diffs,
  });

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect("/queue?toast=order-removed&tone=success");
}

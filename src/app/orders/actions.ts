"use server";

import { OrderCategory, OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireAuth } from "@/lib/auth";
import {
  collectSubmittedValues,
  FormActionState,
  getNullableTrimmedString,
  getOptionalInt,
  getTrimmedString,
  toFieldErrors,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import { ORDER_STATUS_SORT_ORDER, ORDER_STATUSES } from "@/lib/order-domain";
import {
  ActionIdSchema,
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
  at: Date;
  role: string;
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
  isDeleted: "Deleted",
  notesFromManu: "Manufacturing Notes",
};

const ORDER_CREATE_ALLOWED_FIELDS = [
  "title",
  "description",
  "vendor",
  "orderNumber",
  "orderUrl",
  "quantity",
  "category",
  "requesterName",
  "requesterContact",
] as const;

const ORDER_REQUESTER_UPDATE_ALLOWED_FIELDS = [
  "title",
  "description",
  "vendor",
  "orderNumber",
  "orderUrl",
  "quantity",
  "category",
  "requesterName",
  "requesterContact",
] as const;

const ORDER_MANUFACTURING_UPDATE_ALLOWED_FIELDS = [
  "priority",
  "etaDays",
  "status",
  "notesFromManu",
] as const;

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

function hasUnexpectedFormKeys(
  formData: FormData,
  allowedFields: readonly string[],
) {
  const allowed = new Set(allowedFields);

  for (const key of formData.keys()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }
    if (!allowed.has(key)) {
      return true;
    }
  }

  return false;
}

function parseActionId(id: string) {
  const parsed = ActionIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
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
  role,
  action,
  summary,
  diffs,
}: {
  orderId?: string | null;
  role: string;
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
      role,
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
      isDeleted: false,
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

export async function listDeletedOrders() {
  await requireAdmin();

  return prisma.order.findMany({
    where: { isDeleted: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getOrderById(orderId: string) {
  await requireAuth();

  const parsedOrderId = parseActionId(orderId);
  if (!parsedOrderId) {
    return null;
  }

  return prisma.order.findFirst({
    where: { id: parsedOrderId, isDeleted: false },
  });
}

export async function listOrderActivities(
  orderId: string,
): Promise<OrderActivityFeedItem[]> {
  await requireAuth();

  const parsedOrderId = parseActionId(orderId);
  if (!parsedOrderId) {
    return [];
  }

  const activities = await prisma.orderActivity.findMany({
    where: { orderId: parsedOrderId },
    orderBy: [{ at: "desc" }],
  });

  return activities.map((activity) => ({
    id: activity.id,
    action: activity.action,
    at: activity.at,
    role: activity.role,
    details: parseActivityDetails(activity.details),
  }));
}

export async function createOrder(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const initialEtaDays = 10;
  const submittedValues = collectSubmittedValues(formData, ORDER_CREATE_ALLOWED_FIELDS);

  if (hasUnexpectedFormKeys(formData, ORDER_CREATE_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

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
      submittedValues,
    };
  }

  let createdOrderId: string | null = null;

  try {
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
        isDeleted: null,
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
        isDeleted: created.isDeleted,
        notesFromManu: created.notesFromManu,
      },
    );

    await createOrderActivity({
      orderId: created.id,
      role: user.role,
      action: "ORDER_CREATED",
      summary: "Order created.",
      diffs: createDiffs,
    });

    createdOrderId = created.id;
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("createOrder", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/queue");
  revalidatePath("/orders/new");
  if (!createdOrderId) {
    return {
      success: null,
      error: "Unable to determine the new order identifier.",
      fieldErrors: {},
      submittedValues,
    };
  }
  revalidatePath(`/orders/${createdOrderId}`);
  redirect(`/orders/${createdOrderId}?saved=created`);
}

export async function updateOrderRequesterFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    ORDER_REQUESTER_UPDATE_ALLOWED_FIELDS,
  );
  const parsedOrderId = parseActionId(orderId);

  if (!parsedOrderId) {
    return {
      success: null,
      error: "Invalid order request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  if (hasUnexpectedFormKeys(formData, ORDER_REQUESTER_UPDATE_ALLOWED_FIELDS)) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseRequesterFields(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  try {
    const existing = await prisma.order.findFirst({
      where: { id: parsedOrderId, isDeleted: false },
    });
    if (!existing) {
      return {
        success: null,
        error: "Order not found.",
        fieldErrors: {},
        submittedValues,
      };
    }

    const diffs = buildDiffs(
      existing as unknown as Record<string, unknown>,
      parsed.data,
    );

    await prisma.order.update({
      where: { id: parsedOrderId },
      data: parsed.data,
    });

    await createOrderActivity({
      orderId: parsedOrderId,
      role: user.role,
      action: "ORDER_REQUESTER_UPDATED",
      summary: summarizeDiffs(diffs, "Requester fields saved without value changes."),
      diffs,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("updateOrderRequesterFields", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${parsedOrderId}`);
  redirect(`/orders/${parsedOrderId}?saved=requester`);
}

export async function updateOrderManufacturingFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();
  const submittedValues = collectSubmittedValues(
    formData,
    ORDER_MANUFACTURING_UPDATE_ALLOWED_FIELDS,
  );
  const parsedOrderId = parseActionId(orderId);

  if (!parsedOrderId) {
    return {
      success: null,
      error: "Invalid order request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  if (
    hasUnexpectedFormKeys(formData, ORDER_MANUFACTURING_UPDATE_ALLOWED_FIELDS)
  ) {
    return {
      success: null,
      error: "Unexpected fields in request.",
      fieldErrors: {},
      submittedValues,
    };
  }

  const parsed = parseManufacturingFields(formData);
  if (!parsed.success) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
      submittedValues,
    };
  }

  try {
    const existing = await prisma.order.findFirst({
      where: { id: parsedOrderId, isDeleted: false },
    });
    if (!existing) {
      return {
        success: null,
        error: "Order not found.",
        fieldErrors: {},
        submittedValues,
      };
    }

    const diffs = buildDiffs(
      existing as unknown as Record<string, unknown>,
      parsed.data,
    );

    await prisma.order.update({
      where: { id: parsedOrderId },
      data: {
        ...parsed.data,
        etaTargetDate: addDays(new Date(), parsed.data.etaDays),
      },
    });

    await createOrderActivity({
      orderId: parsedOrderId,
      role: user.role,
      action: "ORDER_MANUFACTURING_UPDATED",
      summary: summarizeDiffs(
        diffs,
        "Manufacturing fields saved without value changes.",
      ),
      diffs,
    });
  } catch (error) {
    return {
      success: null,
      error: handleServerMutationError("updateOrderManufacturingFields", error),
      fieldErrors: {},
      submittedValues,
    };
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${parsedOrderId}`);
  redirect(`/orders/${parsedOrderId}?saved=manufacturing`);
}

export async function removeOrderFromList(orderId: string) {
  const parsedOrderId = parseActionId(orderId);
  if (!parsedOrderId) {
    redirect("/queue?toast=order-not-found&tone=debug");
  }

  const actor = await requireAdmin();
  let redirectTarget = "/queue?toast=order-removed&tone=success";

  try {
    const existing = await prisma.order.findUnique({
      where: { id: parsedOrderId },
    });

    if (!existing) {
      redirectTarget = "/queue?toast=order-not-found&tone=debug";
    } else if (existing.isDeleted) {
      redirectTarget = "/queue?toast=already-removed&tone=debug";
    } else {
      const nextStatus = "CANCELLED";
      const diffs = buildDiffs(
        { status: existing.status, isDeleted: existing.isDeleted },
        { status: nextStatus, isDeleted: true },
      );

      await prisma.order.update({
        where: { id: parsedOrderId },
        data: {
          status: nextStatus,
          isDeleted: true,
        },
      });

      await createOrderActivity({
        orderId: parsedOrderId,
        role: actor.role,
        action: "ORDER_SOFT_DELETED",
        summary: summarizeDiffs(
          diffs,
          "Order moved to trash.",
        ),
        diffs,
      });
    }
  } catch (error) {
    handleServerMutationError("removeOrderFromList", error);
    redirectTarget = "/queue?toast=operation-failed&tone=debug";
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${parsedOrderId}`);
  redirect(redirectTarget);
}

export async function restoreOrderFromTrash(orderId: string) {
  const parsedOrderId = parseActionId(orderId);
  if (!parsedOrderId) {
    redirect("/queue?toast=order-not-found&tone=debug");
  }

  const actor = await requireAdmin();
  let redirectTarget = "/queue?toast=order-restored&tone=success";

  try {
    const existing = await prisma.order.findUnique({
      where: { id: parsedOrderId },
    });

    if (!existing || !existing.isDeleted) {
      redirectTarget = "/queue?toast=order-not-found&tone=debug";
    } else {
      const nextStatus = existing.status === "CANCELLED" ? "NEW" : existing.status;
      const diffs = buildDiffs(
        { status: existing.status, isDeleted: existing.isDeleted },
        { status: nextStatus, isDeleted: false },
      );

      await prisma.order.update({
        where: { id: parsedOrderId },
        data: {
          isDeleted: false,
          status: nextStatus,
        },
      });

      await createOrderActivity({
        orderId: parsedOrderId,
        role: actor.role,
        action: "ORDER_RESTORED",
        summary: summarizeDiffs(diffs, "Order restored from trash."),
        diffs,
      });
    }
  } catch (error) {
    handleServerMutationError("restoreOrderFromTrash", error);
    redirectTarget = "/queue?toast=operation-failed&tone=debug";
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${parsedOrderId}`);
  redirect(redirectTarget);
}

export async function permanentlyDeleteOrder(orderId: string) {
  const parsedOrderId = parseActionId(orderId);
  if (!parsedOrderId) {
    redirect("/queue?toast=order-not-found&tone=debug");
  }

  const actor = await requireAdmin();
  let redirectTarget = "/queue?toast=order-permanently-deleted&tone=success";

  try {
    const existing = await prisma.order.findUnique({
      where: { id: parsedOrderId },
    });

    if (!existing || !existing.isDeleted) {
      redirectTarget = "/queue?toast=order-not-found&tone=debug";
    } else {
      await createOrderActivity({
        orderId: null,
        role: actor.role,
        action: "ORDER_PERMANENTLY_DELETED",
        summary: "Order permanently deleted.",
        diffs: [
          {
            field: "orderId",
            from: parsedOrderId,
            to: "deleted",
          },
        ],
      });

      await prisma.order.delete({
        where: { id: parsedOrderId },
      });
    }
  } catch (error) {
    handleServerMutationError("permanentlyDeleteOrder", error);
    redirectTarget = "/queue?toast=operation-failed&tone=debug";
  }

  revalidatePath("/queue");
  redirect(redirectTarget);
}

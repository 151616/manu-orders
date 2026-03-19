"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { db, ordersCollection, type OrderDoc } from "@/lib/firestore";
import {
  FormActionState,
  EMPTY_FORM_STATE,
  getTrimmedString,
  getNullableTrimmedString,
  getOptionalInt,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import {
  ORDER_CATEGORIES,
  ORDER_STATUSES,
  ORDER_STATUS_SORT_ORDER,
  ROBOTS,
  type OrderCategory,
  type OrderStatus,
  type Robot,
} from "@/lib/order-domain";
import { addDays } from "@/lib/eta";

/* ------------------------------------------------------------------ */
/*  Serialised order shape returned to pages                          */
/* ------------------------------------------------------------------ */

export type SerializedOrder = {
  id: string;
  title: string;
  description: string | null;
  requesterName: string;
  vendor: string | null;
  orderNumber: string | null;
  orderUrl: string | null;
  quantity: number | null;
  category: string;
  priority: number;
  etaDays: number;
  etaTargetDate: Date | null;
  status: string;
  isDeleted: boolean;
  notesFromManu: string | null;
  robot: string | null;
  createdByLabel: string | null;
  updatedAt: Date;
};

function docToOrder(id: string, data: OrderDoc): SerializedOrder {
  return {
    id,
    title: data.title,
    description: data.description ?? null,
    requesterName: data.requesterName,
    vendor: data.vendor ?? null,
    orderNumber: data.orderNumber ?? null,
    orderUrl: data.orderUrl ?? null,
    quantity: data.quantity ?? null,
    category: data.category,
    priority: data.priority,
    etaDays: data.etaDays,
    etaTargetDate: data.etaTargetDate?.toDate() ?? null,
    status: data.status,
    isDeleted: data.isDeleted,
    notesFromManu: data.notesFromManu ?? null,
    robot: data.robot ?? null,
    createdByLabel: data.createdByLabel ?? null,
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  };
}

/* ------------------------------------------------------------------ */
/*  List helpers                                                      */
/* ------------------------------------------------------------------ */

type ListOrdersInput = {
  search?: string | null;
  status?: OrderStatus | "ALL" | null;
  category?: OrderCategory | "ALL" | null;
  robot?: Robot | "ALL" | null;
};

export async function listOrders({
  search,
  status,
  category,
  robot,
}: ListOrdersInput = {}): Promise<SerializedOrder[]> {
  await requireAuth();

  const trimmedSearch = search?.trim().toLowerCase() ?? "";
  const statusFilter =
    status && status !== "ALL" && ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : undefined;
  const categoryFilter =
    category && category !== "ALL" && ORDER_CATEGORIES.includes(category as OrderCategory)
      ? (category as OrderCategory)
      : undefined;
  const robotFilter =
    robot && robot !== "ALL" && ROBOTS.includes(robot as Robot)
      ? (robot as Robot)
      : undefined;

  try {
    // Fetch all non-deleted orders, filter client-side to avoid composite indexes
    const snapshot = await ordersCollection()
      .where("isDeleted", "==", false)
      .get();

    let orders: SerializedOrder[] = snapshot.docs.map((doc) =>
      docToOrder(doc.id, doc.data() as OrderDoc),
    );

    // Apply filters client-side
    if (statusFilter) {
      orders = orders.filter((o) => o.status === statusFilter);
    } else {
      // Filter out CANCELLED and PENDING_ORDER by default
      orders = orders.filter(
        (o) => o.status !== "CANCELLED" && o.status !== "PENDING_ORDER",
      );
    }
    if (categoryFilter) {
      orders = orders.filter((o) => o.category === categoryFilter);
    }
    if (robotFilter) {
      orders = orders.filter((o) => o.robot === robotFilter);
    }

    // Client-side text search (Firestore doesn't support full-text)
    if (trimmedSearch) {
      orders = orders.filter(
        (o) =>
          o.title.toLowerCase().includes(trimmedSearch) ||
          (o.orderNumber ?? "").toLowerCase().includes(trimmedSearch) ||
          o.requesterName.toLowerCase().includes(trimmedSearch),
      );
    }

    // Sort: priority desc → status sort order
    const statusSortValue = (s: string) =>
      ORDER_STATUS_SORT_ORDER[s as OrderStatus] ?? Number.MAX_SAFE_INTEGER;

    orders.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return statusSortValue(a.status) - statusSortValue(b.status);
    });

    return orders;
  } catch (error) {
    console.error("[listOrders] failed, returning empty result.", error);
    return [];
  }
}

export async function listPendingOrders(): Promise<SerializedOrder[]> {
  await requireAuth();
  try {
    const snapshot = await ordersCollection()
      .where("status", "==", "PENDING_ORDER")
      .get();

    const orders = snapshot.docs
      .map((doc) => docToOrder(doc.id, doc.data() as OrderDoc))
      .filter((o) => !o.isDeleted)
      .sort((a, b) => b.priority - a.priority);

    return orders;
  } catch (error) {
    console.error("[listPendingOrders] failed.", error);
    return [];
  }
}

export async function listDeletedOrders(): Promise<SerializedOrder[]> {
  await requireAdmin();
  try {
    const snapshot = await ordersCollection()
      .where("isDeleted", "==", true)
      .get();

    const orders = snapshot.docs
      .map((doc) => docToOrder(doc.id, doc.data() as OrderDoc))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return orders;
  } catch (error) {
    console.error("[listDeletedOrders] failed.", error);
    return [];
  }
}

export async function getOrderById(
  orderId: string,
): Promise<SerializedOrder | null> {
  await requireAuth();
  if (!orderId) return null;

  try {
    const doc = await ordersCollection().doc(orderId).get();
    if (!doc.exists) return null;
    const data = doc.data() as OrderDoc;
    if (data.isDeleted) return null;
    return docToOrder(doc.id, data);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Create order                                                       */
/* ------------------------------------------------------------------ */

export async function createOrder(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAdmin();

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const vendor = getNullableTrimmedString(formData.get("vendor"));
  const orderNumber = getNullableTrimmedString(formData.get("orderNumber"));
  const orderUrl = getNullableTrimmedString(formData.get("orderUrl"));
  const quantityRaw = getOptionalInt(formData.get("quantity"));
  const categoryRaw = getTrimmedString(formData.get("category"));
  const requesterName = getTrimmedString(formData.get("requesterName"));
  const priorityRaw = getOptionalInt(formData.get("priority"));
  const etaDaysRaw = getOptionalInt(formData.get("etaDays"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!requesterName) fieldErrors.requesterName = "Requester name is required.";
  if (!ORDER_CATEGORIES.includes(categoryRaw as OrderCategory)) {
    fieldErrors.category = "Please select a category.";
  }
  if (quantityRaw !== null && (isNaN(quantityRaw) || quantityRaw < 1)) {
    fieldErrors.quantity = "Quantity must be at least 1.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors,
      submittedValues: {},
    };
  }

  const priority = priorityRaw ?? 3;
  const etaDays = etaDaysRaw ?? 10;
  const robot: string | null =
    robotRaw && ROBOTS.includes(robotRaw as Robot) ? robotRaw : null;

  let createdOrderId: string | null = null;

  try {
    const now = FieldValue.serverTimestamp();
    const docRef = await ordersCollection().add({
      title,
      description,
      requesterName,
      vendor,
      orderNumber,
      orderUrl,
      quantity: quantityRaw,
      category: categoryRaw,
      priority,
      etaDays,
      etaTargetDate: addDays(new Date(), etaDays),
      status: "NEW",
      isDeleted: false,
      notesFromManu: null,
      robot,
      createdByLabel: user.label,
      updatedAt: now,
    });
    createdOrderId = docRef.id;
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createOrder", error),
    };
  }

  revalidatePath("/queue");
  if (createdOrderId) {
    revalidatePath(`/orders/${createdOrderId}`);
    redirect(`/orders/${createdOrderId}?saved=created`);
  }

  return {
    success: "Order created.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

/* ------------------------------------------------------------------ */
/*  Update order fields                                                */
/* ------------------------------------------------------------------ */

export async function updateOrderRequesterFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  if (!orderId) return { ...EMPTY_FORM_STATE, error: "Invalid order." };

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const vendor = getNullableTrimmedString(formData.get("vendor"));
  const orderNumber = getNullableTrimmedString(formData.get("orderNumber"));
  const orderUrl = getNullableTrimmedString(formData.get("orderUrl"));
  const quantityRaw = getOptionalInt(formData.get("quantity"));
  const categoryRaw = getTrimmedString(formData.get("category"));
  const requesterName = getTrimmedString(formData.get("requesterName"));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!requesterName) fieldErrors.requesterName = "Requester name is required.";
  if (!ORDER_CATEGORIES.includes(categoryRaw as OrderCategory)) {
    fieldErrors.category = "Please select a category.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors,
      submittedValues: {},
    };
  }

  try {
    const docRef = ordersCollection().doc(orderId);
    const doc = await docRef.get();
    if (!doc.exists) return { ...EMPTY_FORM_STATE, error: "Order not found." };
    const existing = doc.data() as OrderDoc;

    // Auto-flip PENDING_ORDER → NEW when order number provided
    const isFlipping =
      existing.status === "PENDING_ORDER" &&
      orderNumber != null &&
      orderNumber.trim().length > 0;

    await docRef.update({
      title,
      description,
      vendor,
      orderNumber,
      orderUrl,
      quantity: quantityRaw,
      category: categoryRaw,
      requesterName,
      ...(isFlipping
        ? {
            status: "NEW",
            etaTargetDate: addDays(new Date(), existing.etaDays),
          }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("updateOrderRequesterFields", error),
    };
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?saved=requester`);
}

export async function updateOrderManufacturingFields(
  orderId: string,
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  if (!orderId) return { ...EMPTY_FORM_STATE, error: "Invalid order." };

  const priorityRaw = getOptionalInt(formData.get("priority"));
  const etaDaysRaw = getOptionalInt(formData.get("etaDays"));
  const statusRaw = getTrimmedString(formData.get("status"));
  const notesFromManu = getNullableTrimmedString(formData.get("notesFromManu"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));

  const fieldErrors: Record<string, string> = {};
  if (!ORDER_STATUSES.includes(statusRaw as OrderStatus)) {
    fieldErrors.status = "Invalid status.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors,
      submittedValues: {},
    };
  }

  const priority = priorityRaw ?? 3;
  const etaDays = etaDaysRaw ?? 10;
  const robot: string | null =
    robotRaw && ROBOTS.includes(robotRaw as Robot) ? robotRaw : null;

  try {
    await ordersCollection().doc(orderId).update({
      priority,
      etaDays,
      etaTargetDate: addDays(new Date(), etaDays),
      status: statusRaw,
      notesFromManu,
      robot,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("updateOrderManufacturingFields", error),
    };
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}?saved=manufacturing`);
}

/* ------------------------------------------------------------------ */
/*  Soft delete / restore / permanent delete                           */
/* ------------------------------------------------------------------ */

export async function removeOrderFromList(orderId: string) {
  await requireAdmin();
  if (!orderId) redirect("/queue?toast=order-not-found&tone=debug");

  let redirectTarget = `/queue?toast=order-removed&tone=success&undoOrderId=${orderId}`;

  try {
    const docRef = ordersCollection().doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists) {
      redirectTarget = "/queue?toast=order-not-found&tone=debug";
    } else {
      const data = doc.data() as OrderDoc;
      if (data.isDeleted) {
        redirectTarget = "/queue?toast=already-removed&tone=debug";
      } else {
        await docRef.update({
          status: "CANCELLED",
          isDeleted: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleServerMutationError("removeOrderFromList", error);
    redirectTarget = "/queue?toast=operation-failed&tone=debug";
  }

  revalidatePath("/queue");
  revalidatePath(`/orders/${orderId}`);
  redirect(redirectTarget);
}

export async function restoreOrderFromTrash(
  orderId: string,
  returnTo: string = "queue",
) {
  await requireAdmin();
  const targetPath = returnTo === "trash" ? "/trash" : "/queue";
  if (!orderId) redirect(`${targetPath}?toast=order-not-found&tone=debug`);

  let redirectTarget = `${targetPath}?toast=order-restored&tone=success`;

  try {
    const docRef = ordersCollection().doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists || !(doc.data() as OrderDoc).isDeleted) {
      redirectTarget = `${targetPath}?toast=order-not-found&tone=debug`;
    } else {
      const data = doc.data() as OrderDoc;
      const nextStatus = data.status === "CANCELLED" ? "NEW" : data.status;
      await docRef.update({
        isDeleted: false,
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    handleServerMutationError("restoreOrderFromTrash", error);
    redirectTarget = `${targetPath}?toast=operation-failed&tone=debug`;
  }

  revalidatePath("/queue");
  revalidatePath("/trash");
  revalidatePath(`/orders/${orderId}`);
  redirect(redirectTarget);
}

export async function permanentlyDeleteOrder(
  orderId: string,
  returnTo: string = "queue",
) {
  await requireAdmin();
  const targetPath = returnTo === "trash" ? "/trash" : "/queue";
  if (!orderId) redirect(`${targetPath}?toast=order-not-found&tone=debug`);

  let redirectTarget = `${targetPath}?toast=order-permanently-deleted&tone=success`;

  try {
    const docRef = ordersCollection().doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists || !(doc.data() as OrderDoc).isDeleted) {
      redirectTarget = `${targetPath}?toast=order-not-found&tone=debug`;
    } else {
      await docRef.delete();
    }
  } catch (error) {
    handleServerMutationError("permanentlyDeleteOrder", error);
    redirectTarget = `${targetPath}?toast=operation-failed&tone=debug`;
  }

  revalidatePath("/queue");
  revalidatePath("/trash");
  redirect(redirectTarget);
}

/* ------------------------------------------------------------------ */
/*  Stubs — features not yet migrated                                  */
/* ------------------------------------------------------------------ */

export async function listOrderActivities(_orderId: string) {
  await requireAuth();
  return [];
}

export async function listOrderAttachments(_orderId: string) {
  await requireAuth();
  return [];
}

export async function uploadOrderAttachment(
  _orderId: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAdmin();
  return { ...EMPTY_FORM_STATE, error: "Attachments are being migrated." };
}

export async function deleteOrderAttachment(
  _orderId: string,
  _attachmentId: string,
) {
  await requireAdmin();
}

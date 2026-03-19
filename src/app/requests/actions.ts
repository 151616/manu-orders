"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireLeadership, type AuthUser } from "@/lib/auth";
import {
  orderRequestsCollection,
  trackingRequestsCollection,
  ordersCollection,
  type OrderRequestDoc,
  type TrackingRequestDoc,
  type RequestStatus,
} from "@/lib/firestore";
import {
  type FormActionState,
  EMPTY_FORM_STATE,
  getTrimmedString,
  getNullableTrimmedString,
  getOptionalInt,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import {
  ORDER_CATEGORIES,
  ROBOTS,
  type OrderCategory,
  type Robot,
} from "@/lib/order-domain";
import { addDays } from "@/lib/eta";
import {
  notifyNewOrderRequest,
  notifyNewTrackingRequest,
  notifyRequestApproved,
  notifyRequestRejected,
} from "@/lib/slack";

/* ------------------------------------------------------------------ */
/*  Serialised shapes returned to pages                                */
/* ------------------------------------------------------------------ */

export type SerializedOrderRequest = {
  id: string;
  status: RequestStatus;
  submittedByLabel: string;
  submittedByUserId: string;
  reviewedByLabel: string | null;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  vendor: string | null;
  orderUrl: string | null;
  quantity: number | null;
  category: string;
  priority: number;
  etaDays: number;
  robot: string | null;
  createdAt: string; // ISO string
  updatedAt: string;
};

export type SerializedTrackingRequest = {
  id: string;
  status: RequestStatus;
  submittedByLabel: string;
  submittedByUserId: string;
  reviewedByLabel: string | null;
  rejectionReason: string | null;
  title: string;
  description: string | null;
  type: string;
  otherType: string | null;
  robot: string | null;
  createdAt: string;
  updatedAt: string;
};

function docToOrderRequest(
  id: string,
  d: OrderRequestDoc,
): SerializedOrderRequest {
  return {
    id,
    status: d.status,
    submittedByLabel: d.submittedByLabel,
    submittedByUserId: d.submittedByUserId,
    reviewedByLabel: d.reviewedByLabel ?? null,
    rejectionReason: d.rejectionReason ?? null,
    title: d.title,
    description: d.description ?? null,
    vendor: d.vendor ?? null,
    orderUrl: d.orderUrl ?? null,
    quantity: d.quantity ?? null,
    category: d.category,
    priority: d.priority,
    etaDays: d.etaDays,
    robot: d.robot ?? null,
    createdAt: d.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

function docToTrackingRequest(
  id: string,
  d: TrackingRequestDoc,
): SerializedTrackingRequest {
  return {
    id,
    status: d.status,
    submittedByLabel: d.submittedByLabel,
    submittedByUserId: d.submittedByUserId,
    reviewedByLabel: d.reviewedByLabel ?? null,
    rejectionReason: d.rejectionReason ?? null,
    title: d.title,
    description: d.description ?? null,
    type: d.type,
    otherType: d.otherType ?? null,
    robot: d.robot ?? null,
    createdAt: d.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  List requests                                                      */
/* ------------------------------------------------------------------ */

export async function listOrderRequests(): Promise<SerializedOrderRequest[]> {
  await requireAuth();
  try {
    const snapshot = await orderRequestsCollection().get();
    return snapshot.docs
      .map((doc) =>
        docToOrderRequest(doc.id, doc.data() as OrderRequestDoc),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  } catch (error) {
    console.error("[listOrderRequests] failed.", error);
    return [];
  }
}

export async function listTrackingRequests(): Promise<
  SerializedTrackingRequest[]
> {
  await requireAuth();
  try {
    const snapshot = await trackingRequestsCollection().get();
    return snapshot.docs
      .map((doc) =>
        docToTrackingRequest(doc.id, doc.data() as TrackingRequestDoc),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  } catch (error) {
    console.error("[listTrackingRequests] failed.", error);
    return [];
  }
}

export async function getPendingRequestCount(): Promise<number> {
  try {
    const [orderSnap, trackingSnap] = await Promise.all([
      orderRequestsCollection().where("status", "==", "PENDING").get(),
      trackingRequestsCollection().where("status", "==", "PENDING").get(),
    ]);
    return orderSnap.size + trackingSnap.size;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Create order request (Level 4 members)                             */
/* ------------------------------------------------------------------ */

export async function createOrderRequest(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const vendor = getNullableTrimmedString(formData.get("vendor"));
  const orderUrl = getNullableTrimmedString(formData.get("orderUrl"));
  const quantityRaw = getOptionalInt(formData.get("quantity"));
  const categoryRaw = getTrimmedString(formData.get("category"));
  const priorityRaw = getOptionalInt(formData.get("priority"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (
    !categoryRaw ||
    !ORDER_CATEGORIES.includes(categoryRaw as OrderCategory)
  ) {
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
  const robot: string | null =
    robotRaw && ROBOTS.includes(robotRaw as Robot) ? robotRaw : null;

  try {
    const now = FieldValue.serverTimestamp();
    await orderRequestsCollection().add({
      status: "PENDING",
      submittedByLabel: user.label,
      submittedByUserId: user.id,
      reviewedAt: null,
      reviewedByLabel: null,
      rejectionReason: null,
      title,
      description,
      vendor,
      orderUrl,
      quantity: quantityRaw,
      category: categoryRaw,
      priority,
      etaDays: 10,
      robot,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createOrderRequest", error),
    };
  }

  void notifyNewOrderRequest({
    title,
    submittedBy: user.name,
    category: categoryRaw,
    vendor,
    quantity: quantityRaw,
  });

  revalidatePath("/requests");
  return {
    success: "Request submitted! An admin will review it shortly.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

/* ------------------------------------------------------------------ */
/*  Create tracking request (Level 4 members)                          */
/* ------------------------------------------------------------------ */

const VALID_TRACKING_TYPES = ["CNC", "DRILL", "TAP", "CUT", "OTHER"];

export async function createTrackingRequest(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const typeRaw = getTrimmedString(formData.get("type"));
  const otherType = getNullableTrimmedString(formData.get("otherType"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!VALID_TRACKING_TYPES.includes(typeRaw)) {
    fieldErrors.type = "Please select a type.";
  }
  if (typeRaw === "OTHER" && !otherType) {
    fieldErrors.otherType = "Please describe the type.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: "Please fix the highlighted fields.",
      fieldErrors,
      submittedValues: {},
    };
  }

  const robot: string | null =
    robotRaw && ROBOTS.includes(robotRaw as Robot) ? robotRaw : null;

  try {
    const now = FieldValue.serverTimestamp();
    await trackingRequestsCollection().add({
      status: "PENDING",
      submittedByLabel: user.label,
      submittedByUserId: user.id,
      reviewedAt: null,
      reviewedByLabel: null,
      rejectionReason: null,
      title,
      description,
      type: typeRaw,
      otherType,
      robot,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createTrackingRequest", error),
    };
  }

  void notifyNewTrackingRequest({
    title,
    submittedBy: user.name,
    type: typeRaw === "OTHER" && otherType ? otherType : typeRaw,
  });

  revalidatePath("/requests");
  return {
    success: "Request submitted! An admin will review it shortly.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

/* ------------------------------------------------------------------ */
/*  Approve / reject order requests (Level 1-3)                        */
/* ------------------------------------------------------------------ */

export async function approveOrderRequest(
  id: string,
): Promise<{ orderId: string }> {
  const user = await requireLeadership();
  if (!id) return { orderId: "" };

  try {
    const docRef = orderRequestsCollection().doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return { orderId: "" };

    const data = doc.data() as OrderRequestDoc;
    if (data.status !== "PENDING") return { orderId: "" };

    // Create the order in Firestore
    const now = FieldValue.serverTimestamp();
    const orderRef = await ordersCollection().add({
      title: data.title,
      description: data.description,
      requesterName: data.submittedByLabel.split(":").pop() ?? data.submittedByLabel,
      vendor: data.vendor,
      orderNumber: null,
      orderUrl: data.orderUrl,
      quantity: data.quantity,
      category: data.category,
      priority: data.priority,
      etaDays: data.etaDays,
      etaTargetDate: addDays(new Date(), data.etaDays),
      status: "PENDING_ORDER",
      isDeleted: false,
      notesFromManu: null,
      robot: data.robot,
      createdByLabel: data.submittedByLabel,
      updatedAt: now,
    });

    // Mark the request as approved
    await docRef.update({
      status: "APPROVED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByLabel: user.label,
      updatedAt: FieldValue.serverTimestamp(),
    });

    void notifyRequestApproved({
      kind: "order",
      title: data.title,
      approvedBy: user.name,
    });

    revalidatePath("/requests");
    revalidatePath("/queue");
    return { orderId: orderRef.id };
  } catch (error) {
    console.error("[approveOrderRequest] failed.", error);
    return { orderId: "" };
  }
}

export async function approveOrderRequestForm(id: string): Promise<void> {
  await approveOrderRequest(id);
  revalidatePath("/requests");
  redirect("/requests?toast=order-request-approved&tone=success");
}

export async function rejectOrderRequest(
  id: string,
  formData: FormData,
): Promise<void> {
  const user = await requireLeadership();
  if (!id) return;

  const reason = getNullableTrimmedString(formData.get("reason"));

  try {
    const docRef = orderRequestsCollection().doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return;
    if ((doc.data() as OrderRequestDoc).status !== "PENDING") return;

    const data = doc.data() as OrderRequestDoc;

    await docRef.update({
      status: "REJECTED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByLabel: user.label,
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    void notifyRequestRejected({
      kind: "order",
      title: data.title,
      rejectedBy: user.name,
      reason,
    });
  } catch (error) {
    console.error("[rejectOrderRequest] failed.", error);
  }

  revalidatePath("/requests");
  redirect("/requests?toast=order-request-rejected&tone=success");
}

/* ------------------------------------------------------------------ */
/*  Approve / reject tracking requests (Level 1-3)                     */
/* ------------------------------------------------------------------ */

export async function approveTrackingRequest(id: string): Promise<void> {
  const user = await requireLeadership();
  if (!id) return;

  try {
    const docRef = trackingRequestsCollection().doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return;
    const data = doc.data() as TrackingRequestDoc;
    if (data.status !== "PENDING") return;

    await docRef.update({
      status: "APPROVED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByLabel: user.label,
      updatedAt: FieldValue.serverTimestamp(),
    });

    void notifyRequestApproved({
      kind: "tracking",
      title: data.title,
      approvedBy: user.name,
    });
  } catch (error) {
    console.error("[approveTrackingRequest] failed.", error);
  }

  revalidatePath("/requests");
  redirect("/requests?toast=tracking-request-approved&tone=success");
}

export async function rejectTrackingRequest(
  id: string,
  formData: FormData,
): Promise<void> {
  const user = await requireLeadership();
  if (!id) return;

  const reason = getNullableTrimmedString(formData.get("reason"));

  try {
    const docRef = trackingRequestsCollection().doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return;
    const data = doc.data() as TrackingRequestDoc;
    if (data.status !== "PENDING") return;

    await docRef.update({
      status: "REJECTED",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByLabel: user.label,
      rejectionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    void notifyRequestRejected({
      kind: "tracking",
      title: data.title,
      rejectedBy: user.name,
      reason,
    });
  } catch (error) {
    console.error("[rejectTrackingRequest] failed.", error);
  }

  revalidatePath("/requests");
  redirect("/requests?toast=tracking-request-rejected&tone=success");
}

/* ------------------------------------------------------------------ */
/*  Update requests (by submitter, while still pending)                */
/* ------------------------------------------------------------------ */

export async function updateOrderRequest(
  id: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAuth();
  return { ...EMPTY_FORM_STATE, error: "Editing requests is not yet available." };
}

export async function updateTrackingRequest(
  id: string,
  _prev: FormActionState,
  _formData: FormData,
): Promise<FormActionState> {
  await requireAuth();
  return { ...EMPTY_FORM_STATE, error: "Editing requests is not yet available." };
}

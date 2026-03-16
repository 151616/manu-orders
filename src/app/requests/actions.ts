"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireAdmin } from "@/lib/auth";
import {
  EMPTY_FORM_STATE,
  FormActionState,
  getNullableTrimmedString,
  getTrimmedString,
  getOptionalInt,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import { prisma } from "@/lib/prisma";
import type { ManuRequestType, OrderCategory, Robot } from "@prisma/client";
import { addDays } from "@/lib/eta";
import { ORDER_CATEGORIES } from "@/lib/order-domain";

const VALID_TRACKING_TYPES: ManuRequestType[] = [
  "CNC",
  "DRILL",
  "TAP",
  "CUT",
  "OTHER",
];
const VALID_ROBOTS: Robot[] = ["LAMBDA", "GAMMA"];

// ─── Viewer: Submit order request ────────────────────────────────────────────

export async function createOrderRequest(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const requesterName = getTrimmedString(formData.get("requesterName"));
  const vendor = getNullableTrimmedString(formData.get("vendor"));
  const orderUrl = getNullableTrimmedString(formData.get("orderUrl"));
  const quantityRaw = getOptionalInt(formData.get("quantity"));
  const categoryRaw = getTrimmedString(formData.get("category"));
  const priorityRaw = getOptionalInt(formData.get("priority"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));
  const robot: Robot | null = VALID_ROBOTS.includes(robotRaw as Robot) ? (robotRaw as Robot) : null;

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
      submittedValues: {
        title,
        description: description ?? "",
        requesterName,
        vendor: vendor ?? "",
        orderUrl: orderUrl ?? "",
        quantity: quantityRaw?.toString() ?? "",
        category: categoryRaw,
        priority: priorityRaw?.toString() ?? "",
        robot: robotRaw ?? "",
      },
    };
  }

  try {
    await prisma.orderRequest.create({
      data: {
        submittedByLabel: user.label,
        title,
        description,
        requesterName,
        vendor,
        orderUrl,
        quantity: quantityRaw ?? null,
        category: categoryRaw as OrderCategory,
        priority: priorityRaw ?? 3,
        robot,
      },
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createOrderRequest", error),
    };
  }

  revalidatePath("/requests");
  return {
    success: "Request submitted! An admin will review it shortly.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

// ─── Viewer: Submit tracking request ─────────────────────────────────────────

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
  const robot: Robot | null = VALID_ROBOTS.includes(robotRaw as Robot) ? (robotRaw as Robot) : null;

  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "Title is required.";
  if (!VALID_TRACKING_TYPES.includes(typeRaw as ManuRequestType)) {
    fieldErrors.type = "Please select a valid type.";
  }
  if (typeRaw === "OTHER" && !otherType) {
    fieldErrors.otherType = "Please describe the type.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: null,
      fieldErrors,
      submittedValues: {
        title,
        description: description ?? "",
        type: typeRaw,
        otherType: otherType ?? "",
      },
    };
  }

  try {
    await prisma.trackingRequest.create({
      data: {
        submittedByLabel: user.label,
        title,
        description,
        type: typeRaw as ManuRequestType,
        otherType: typeRaw === "OTHER" ? otherType : null,
        robot,
      },
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createTrackingRequest", error),
    };
  }

  revalidatePath("/requests");
  return {
    success: "Tracking request submitted! An admin will review it shortly.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

// ─── Admin: Approve / Reject order request ────────────────────────────────────

export async function approveOrderRequest(id: string): Promise<void> {
  const admin = await requireAdmin();

  const req = await prisma.orderRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.order.create({
      data: {
        title: req.title,
        description: req.description,
        requesterName: req.requesterName,
        vendor: req.vendor,
        orderNumber: req.orderNumber,
        orderUrl: req.orderUrl,
        quantity: req.quantity,
        category: req.category,
        priority: req.priority,
        etaDays: req.etaDays,
        etaTargetDate: addDays(new Date(), req.etaDays),
        status: "NEW",
        createdByLabel: admin.label,
        robot: req.robot ?? null,
      },
    }),
    prisma.orderRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByLabel: admin.label,
      },
    }),
  ]);

  revalidatePath("/queue");
  revalidatePath("/requests");
}

export async function rejectOrderRequest(id: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  await prisma.orderRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByLabel: admin.label,
      rejectionReason: reason,
    },
  });

  revalidatePath("/requests");
}

// ─── Admin: Approve / Reject tracking request ─────────────────────────────────

export async function approveTrackingRequest(id: string): Promise<void> {
  const admin = await requireAdmin();

  const req = await prisma.trackingRequest.findUnique({ where: { id } });
  if (!req || req.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.manuRequest.create({
      data: {
        title: req.title,
        description: req.description,
        type: req.type,
        otherType: req.otherType,
        isFinished: false,
        createdByLabel: admin.label,
        robot: req.robot ?? null,
      },
    }),
    prisma.trackingRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByLabel: admin.label,
      },
    }),
  ]);

  revalidatePath("/tracking");
  revalidatePath("/requests");
}

export async function rejectTrackingRequest(id: string, formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  await prisma.trackingRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByLabel: admin.label,
      rejectionReason: reason,
    },
  });

  revalidatePath("/requests");
}

// ─── Viewer: Edit within 30-second window ─────────────────────────────────────

const EDIT_WINDOW_MS = 30_000;

export async function updateOrderRequest(
  id: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const req = await prisma.orderRequest.findUnique({ where: { id } });
  if (!req) return { ...EMPTY_FORM_STATE, error: "Request not found." };
  if (req.submittedByLabel !== user.label) return { ...EMPTY_FORM_STATE, error: "Not authorized." };
  if (req.status !== "PENDING") return { ...EMPTY_FORM_STATE, error: "Only pending requests can be edited." };
  if (Date.now() - req.createdAt.getTime() > EDIT_WINDOW_MS) {
    return { ...EMPTY_FORM_STATE, error: "The 30-second edit window has passed." };
  }

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const requesterName = getTrimmedString(formData.get("requesterName"));
  const vendor = getNullableTrimmedString(formData.get("vendor"));
  const orderUrl = getNullableTrimmedString(formData.get("orderUrl"));
  const quantityRaw = getOptionalInt(formData.get("quantity"));
  const categoryRaw = getTrimmedString(formData.get("category"));
  const priorityRaw = getOptionalInt(formData.get("priority"));
  const robotRawEdit = getNullableTrimmedString(formData.get("robot"));
  const robotEdit: Robot | null = VALID_ROBOTS.includes(robotRawEdit as Robot) ? (robotRawEdit as Robot) : null;

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
      submittedValues: {
        title,
        description: description ?? "",
        requesterName,
        vendor: vendor ?? "",
        orderUrl: orderUrl ?? "",
        quantity: quantityRaw?.toString() ?? "",
        category: categoryRaw,
        priority: priorityRaw?.toString() ?? "",
        robot: robotRawEdit ?? "",
      },
    };
  }

  try {
    await prisma.orderRequest.update({
      where: { id },
      data: {
        title,
        description,
        requesterName,
        vendor,
        orderUrl,
        quantity: quantityRaw ?? null,
        category: categoryRaw as OrderCategory,
        priority: priorityRaw ?? req.priority,
        robot: robotEdit,
      },
    });
  } catch (error) {
    return { ...EMPTY_FORM_STATE, error: handleServerMutationError("updateOrderRequest", error) };
  }

  revalidatePath("/requests");
  return { success: "Request updated.", error: null, fieldErrors: {}, submittedValues: {} };
}

export async function updateTrackingRequest(
  id: string,
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireAuth();

  const req = await prisma.trackingRequest.findUnique({ where: { id } });
  if (!req) return { ...EMPTY_FORM_STATE, error: "Request not found." };
  if (req.submittedByLabel !== user.label) return { ...EMPTY_FORM_STATE, error: "Not authorized." };
  if (req.status !== "PENDING") return { ...EMPTY_FORM_STATE, error: "Only pending requests can be edited." };
  if (Date.now() - req.createdAt.getTime() > EDIT_WINDOW_MS) {
    return { ...EMPTY_FORM_STATE, error: "The 30-second edit window has passed." };
  }

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const typeRaw = getTrimmedString(formData.get("type"));
  const otherType = getNullableTrimmedString(formData.get("otherType"));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!VALID_TRACKING_TYPES.includes(typeRaw as ManuRequestType)) {
    fieldErrors.type = "Please select a valid type.";
  }
  if (typeRaw === "OTHER" && !otherType) fieldErrors.otherType = "Please describe the type.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: null,
      error: null,
      fieldErrors,
      submittedValues: { title, description: description ?? "", type: typeRaw, otherType: otherType ?? "" },
    };
  }

  try {
    await prisma.trackingRequest.update({
      where: { id },
      data: {
        title,
        description,
        type: typeRaw as ManuRequestType,
        otherType: typeRaw === "OTHER" ? otherType : null,
      },
    });
  } catch (error) {
    return { ...EMPTY_FORM_STATE, error: handleServerMutationError("updateTrackingRequest", error) };
  }

  revalidatePath("/requests");
  return { success: "Request updated.", error: null, fieldErrors: {}, submittedValues: {} };
}

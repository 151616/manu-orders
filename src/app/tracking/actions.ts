"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireLeadership } from "@/lib/auth";
import {
  manuRequestsCollection,
  type ManuRequestDoc,
} from "@/lib/firestore";
import {
  type FormActionState,
  EMPTY_FORM_STATE,
  getTrimmedString,
  getNullableTrimmedString,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import { ROBOTS, type Robot } from "@/lib/order-domain";

/* ------------------------------------------------------------------ */
/*  Serialised shape returned to pages                                 */
/* ------------------------------------------------------------------ */

export type SerializedManuRequest = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  otherType: string | null;
  priority: number;
  robot: string | null;
  fileOriginalName: string | null;
  fileUrl: string | null;
};

function docToManuRequest(
  id: string,
  d: ManuRequestDoc,
): SerializedManuRequest {
  return {
    id,
    title: d.title,
    description: d.description ?? null,
    type: d.type,
    otherType: d.otherType ?? null,
    priority: d.priority ?? 3,
    robot: d.robot ?? null,
    fileOriginalName: null, // file uploads not yet migrated
    fileUrl: null,
  };
}

/* ------------------------------------------------------------------ */
/*  List active (not finished) requests                                */
/* ------------------------------------------------------------------ */

export async function listActiveManuRequests(): Promise<
  SerializedManuRequest[]
> {
  await requireAuth();
  try {
    const snapshot = await manuRequestsCollection()
      .where("isFinished", "==", false)
      .get();

    return snapshot.docs
      .map((doc) => docToManuRequest(doc.id, doc.data() as ManuRequestDoc))
      .sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error("[listActiveManuRequests] failed.", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Create a new tracking request (Level 1-3)                          */
/* ------------------------------------------------------------------ */

const VALID_TYPES = ["CNC", "DRILL", "TAP", "CUT", "OTHER"];

export async function createManuRequest(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireLeadership();

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const typeRaw = getTrimmedString(formData.get("type"));
  const otherType = getNullableTrimmedString(formData.get("otherType"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));
  const priorityRaw = formData.get("priority");
  const priority = Math.min(5, Math.max(1, parseInt(String(priorityRaw ?? "3"), 10) || 3));

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (!VALID_TYPES.includes(typeRaw)) fieldErrors.type = "Please select a type.";
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
    await manuRequestsCollection().add({
      title,
      description,
      type: typeRaw,
      otherType,
      isFinished: false,
      priority,
      robot,
      createdByLabel: user.label,
      updatedAt: now,
    });
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createManuRequest", error),
    };
  }

  revalidatePath("/tracking");
  return {
    success: "Request added to tracking.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

/* ------------------------------------------------------------------ */
/*  Mark a request as finished (Level 1-3)                             */
/* ------------------------------------------------------------------ */

export async function finishManuRequest(id: string): Promise<void> {
  await requireLeadership();
  if (!id) return;

  try {
    await manuRequestsCollection().doc(id).update({
      isFinished: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[finishManuRequest] failed.", error);
  }

  revalidatePath("/tracking");
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  EMPTY_FORM_STATE,
  FormActionState,
  getNullableTrimmedString,
  getTrimmedString,
} from "@/lib/form-utils";
import { handleServerMutationError } from "@/lib/action-errors";
import { prisma } from "@/lib/prisma";
import {
  deleteTrackingFile,
  uploadTrackingFile,
} from "@/lib/manu-tracking-storage";
import type { ManuRequestType, Robot } from "@prisma/client";

const VALID_TYPES: ManuRequestType[] = ["CNC", "DRILL", "TAP", "CUT", "OTHER"];
const VALID_ROBOTS: Robot[] = ["LAMBDA", "GAMMA"];
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function createManuRequest(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  try {
    await requireAdmin();
  } catch {
    return { ...EMPTY_FORM_STATE, error: "Admin access required." };
  }

  const title = getTrimmedString(formData.get("title"));
  const description = getNullableTrimmedString(formData.get("description"));
  const typeRaw = getTrimmedString(formData.get("type"));
  const otherType = getNullableTrimmedString(formData.get("otherType"));
  const robotRaw = getNullableTrimmedString(formData.get("robot"));
  const robot: Robot | null = VALID_ROBOTS.includes(robotRaw as Robot) ? (robotRaw as Robot) : null;

  const fieldErrors: Record<string, string> = {};

  if (!title) fieldErrors.title = "Title is required.";
  if (!VALID_TYPES.includes(typeRaw as ManuRequestType)) {
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

  const requestId = randomUUID();

  let fileStoragePath: string | null = null;
  let fileOriginalName: string | null = null;
  let fileContentType: string | null = null;
  let fileSizeBytes: number | null = null;

  const fileEntry = formData.get("cncFile");
  if (fileEntry instanceof File && fileEntry.size > 0) {
    if (fileEntry.size > MAX_FILE_BYTES) {
      return {
        success: null,
        error: "File is too large. Maximum size is 50 MB.",
        fieldErrors: {},
        submittedValues: {
          title,
          description: description ?? "",
          type: typeRaw,
          otherType: otherType ?? "",
        },
      };
    }

    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    try {
      const uploaded = await uploadTrackingFile({
        requestId,
        originalName: fileEntry.name,
        bytes,
        contentType: fileEntry.type || null,
      });
      fileStoragePath = uploaded.storagePath;
      fileOriginalName = fileEntry.name;
      fileContentType = fileEntry.type || null;
      fileSizeBytes = fileEntry.size;
    } catch (uploadError) {
      return {
        ...EMPTY_FORM_STATE,
        error: handleServerMutationError("uploadTrackingFile", uploadError),
      };
    }
  }

  try {
    const user = await requireAdmin();
    await prisma.manuRequest.create({
      data: {
        id: requestId,
        title,
        description,
        type: typeRaw as ManuRequestType,
        otherType: typeRaw === "OTHER" ? otherType : null,
        robot,
        fileStoragePath,
        fileOriginalName,
        fileContentType,
        fileSizeBytes,
        isFinished: false,
        createdByLabel: user.label,
      },
    });
  } catch (error) {
    if (fileStoragePath) {
      await deleteTrackingFile(fileStoragePath).catch(() => undefined);
    }
    return {
      ...EMPTY_FORM_STATE,
      error: handleServerMutationError("createManuRequest", error),
    };
  }

  revalidatePath("/tracking");
  return {
    success: "Request created.",
    error: null,
    fieldErrors: {},
    submittedValues: {},
  };
}

export async function finishManuRequest(id: string): Promise<void> {
  await requireAdmin();

  const request = await prisma.manuRequest.findUnique({ where: { id } });
  if (!request || request.isFinished) return;

  await prisma.manuRequest.update({
    where: { id },
    data: { isFinished: true },
  });

  if (request.fileStoragePath) {
    await deleteTrackingFile(request.fileStoragePath).catch(() => undefined);
  }

  revalidatePath("/tracking");
}

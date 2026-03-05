import { z } from "zod";

export type FormActionState = {
  success: string | null;
  error: string | null;
  fieldErrors: Record<string, string>;
  submittedValues: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormActionState = {
  success: null,
  error: null,
  fieldErrors: {},
  submittedValues: {},
};

export function collectSubmittedValues(
  formData: FormData,
  allowedFields: readonly string[],
): Record<string, string> {
  const submittedValues: Record<string, string> = {};

  allowedFields.forEach((field) => {
    const raw = formData.get(field);
    submittedValues[field] = typeof raw === "string" ? raw : "";
  });

  return submittedValues;
}

export function getTrimmedString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getNullableTrimmedString(
  value: FormDataEntryValue | null,
): string | null {
  const trimmed = getTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
}

export function getOptionalInt(value: FormDataEntryValue | null): number | null {
  const trimmed = getTrimmedString(value);

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const flattened = error.flatten()
    .fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string> = {};

  Object.entries(flattened).forEach(([key, messages]) => {
    if (messages && messages.length > 0) {
      result[key] = messages[0] ?? "Invalid value.";
    }
  });

  return result;
}

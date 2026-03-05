import { OrderCategory, OrderStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) => z.string().max(max).nullable();

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizeUrlInput(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (URL_SCHEME_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

const nullableUrl = (label: string) =>
  z.preprocess(
    normalizeUrlInput,
    z
      .string()
      .max(500, `${label} must be 500 characters or less.`)
      .url(`${label} must be a valid URL.`)
      .nullable(),
  );

const requesterFieldsSchema = z.object({
  title: z.string().min(1, "Title is required.").max(120),
  description: optionalText(2000),
  vendor: optionalText(200),
  orderNumber: optionalText(120),
  orderUrl: nullableUrl("Order URL"),
  quantity: z.number().int("Quantity must be a whole number.").min(1).nullable(),
  category: z.nativeEnum(OrderCategory),
  requesterName: z.string().min(1, "Requester name is required.").max(200),
  requesterContact: optionalText(200),
});

export const OrderCreateSchema = requesterFieldsSchema;
export const OrderRequesterUpdateSchema = requesterFieldsSchema;

export const OrderManufacturingUpdateSchema = z.object({
  priority: z.number().int().min(1).max(5),
  etaDays: z.number().int().min(0).max(365),
  status: z.nativeEnum(OrderStatus),
  notesFromManu: optionalText(2000),
});

export const BookmarkCreateUpdateSchema = z.object({
  name: z.string().min(1, "Bookmark name is required.").max(120),
  defaultVendor: optionalText(200),
  defaultOrderUrl: nullableUrl("Default order URL"),
  defaultCategory: z.nativeEnum(OrderCategory).nullable(),
  defaultDescription: optionalText(2000),
});

export const ActionIdSchema = z.uuid("Invalid identifier.");

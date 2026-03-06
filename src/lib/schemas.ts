import { z } from "zod";
import {
  BOOKMARK_KINDS,
  type BookmarkKind,
} from "@/lib/bookmark-domain";
import {
  ORDER_CATEGORIES,
  ORDER_STATUSES,
} from "@/lib/order-domain";

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
  category: z.enum(ORDER_CATEGORIES),
  requesterName: z.string().min(1, "Requester name is required.").max(200),
});

export const OrderCreateSchema = requesterFieldsSchema.extend({
  priority: z.number().int().min(1).max(5),
  etaDays: z.number().int().min(0).max(365),
});
export const OrderRequesterUpdateSchema = requesterFieldsSchema;

export const OrderManufacturingUpdateSchema = z.object({
  priority: z.number().int().min(1).max(5),
  etaDays: z.number().int().min(0).max(365),
  status: z.enum(ORDER_STATUSES),
  notesFromManu: optionalText(2000),
});

const bookmarkTemplateFieldsSchema = z.object({
  name: z.string().min(1, "Bookmark name is required.").max(120),
  defaultVendor: optionalText(200),
  defaultOrderUrl: nullableUrl("Default order URL"),
  defaultCategory: z.enum(ORDER_CATEGORIES).nullable(),
  defaultDescription: optionalText(2000),
});

const bookmarkSiteFieldsSchema = z.object({
  name: z.string().min(1, "Website name is required.").max(120),
  siteUrl: nullableUrl("Website URL").refine((value) => value !== null, {
    message: "Website URL is required.",
  }),
  siteVendorHint: optionalText(200),
});

export const BookmarkKindSchema = z.enum(BOOKMARK_KINDS);

export const BookmarkTemplateCreateUpdateSchema = bookmarkTemplateFieldsSchema;

export const BookmarkSiteCreateUpdateSchema = bookmarkSiteFieldsSchema;

export const BookmarkCreateUpdateSchema = z.discriminatedUnion("kind", [
  bookmarkTemplateFieldsSchema.extend({
    kind: z.literal("TEMPLATE"),
  }),
  bookmarkSiteFieldsSchema.extend({
    kind: z.literal("SITE"),
  }),
]);

export function isBookmarkKind(value: string): value is BookmarkKind {
  return BOOKMARK_KINDS.includes(value as BookmarkKind);
}

export const ActionIdSchema = z.uuid("Invalid identifier.");

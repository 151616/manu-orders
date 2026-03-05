import { OrderCategory, OrderStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = (max: number) => z.string().max(max).nullable();

const requesterFieldsSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: optionalText(2000),
  vendor: optionalText(200),
  orderNumber: optionalText(120),
  orderUrl: z.url("Order URL must be a valid URL.").nullable(),
  quantity: z.number().int("Quantity must be a whole number.").min(1).nullable(),
  category: z.nativeEnum(OrderCategory),
  requesterName: z.string().min(1, "Requester name is required.").max(200),
  requesterContact: optionalText(200),
});

export const OrderCreateSchema = requesterFieldsSchema;
export const OrderRequesterUpdateSchema = requesterFieldsSchema;

export const OrderManufacturingUpdateSchema = z.object({
  priority: z.number().int().min(1).max(5),
  etaDays: z.number().int().min(0).max(3650),
  status: z.nativeEnum(OrderStatus),
  notesFromManu: optionalText(5000),
});

export const BookmarkCreateUpdateSchema = z.object({
  name: z.string().min(1, "Bookmark name is required.").max(120),
  defaultVendor: optionalText(200),
  defaultOrderUrl: z.url("Default order URL must be a valid URL.").nullable(),
  defaultCategory: z.nativeEnum(OrderCategory).nullable(),
  defaultDescription: optionalText(2000),
});

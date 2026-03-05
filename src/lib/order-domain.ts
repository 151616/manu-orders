import { OrderCategory, OrderStatus } from "@prisma/client";

export const ORDER_CATEGORIES: OrderCategory[] = [
  "CNC",
  "PRINT_3D",
  "LASER",
  "ASSEMBLY",
  "ELECTRICAL",
  "OTHER",
];

export const ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "QUEUED",
  "IN_PROGRESS",
  "WAITING_ON_PARTS",
  "DONE",
  "BLOCKED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  WAITING_ON_PARTS: "Waiting on Parts",
  DONE: "Done",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_SORT_ORDER: Record<OrderStatus, number> = {
  IN_PROGRESS: 0,
  QUEUED: 1,
  NEW: 2,
  WAITING_ON_PARTS: 3,
  BLOCKED: 4,
  DONE: 5,
  CANCELLED: 6,
};

export const ORDER_CATEGORY_LABELS: Record<OrderCategory, string> = {
  CNC: "CNC",
  PRINT_3D: "3D Print",
  LASER: "Laser",
  ASSEMBLY: "Assembly",
  ELECTRICAL: "Electrical",
  OTHER: "Other",
};

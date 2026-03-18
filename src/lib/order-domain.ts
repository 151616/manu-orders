export const ORDER_CATEGORIES = [
  "CNC",
  "PRINT_3D",
  "LASER",
  "ASSEMBLY",
  "ELECTRICAL",
  "OTHER",
] as const;

export type OrderCategory = (typeof ORDER_CATEGORIES)[number];

export const ORDER_STATUSES = [
  "PENDING_ORDER",
  "NEW",
  "QUEUED",
  "IN_PROGRESS",
  "WAITING_ON_PARTS",
  "DONE",
  "BLOCKED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_ORDER: "Yet to be Placed",
  NEW: "New",
  QUEUED: "Queued",
  IN_PROGRESS: "In Progress",
  WAITING_ON_PARTS: "Waiting on Parts",
  DONE: "Done",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_SORT_ORDER: Record<OrderStatus, number> = {
  PENDING_ORDER: 0,
  IN_PROGRESS: 1,
  QUEUED: 2,
  NEW: 3,
  WAITING_ON_PARTS: 4,
  BLOCKED: 5,
  DONE: 6,
  CANCELLED: 7,
};

export const ORDER_CATEGORY_LABELS: Record<OrderCategory, string> = {
  CNC: "CNC",
  PRINT_3D: "3D Print",
  LASER: "Laser",
  ASSEMBLY: "Assembly",
  ELECTRICAL: "Electrical",
  OTHER: "Other",
};

export const ROBOTS = ["LAMBDA", "GAMMA"] as const;
export type Robot = (typeof ROBOTS)[number];

export const ROBOT_LABELS: Record<Robot, string> = {
  LAMBDA: "Lambda",
  GAMMA: "Gamma",
};

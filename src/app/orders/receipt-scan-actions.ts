"use server";

// Receipt scan actions — Prisma removed. Will be rebuilt with Firestore.

import { requireAdmin } from "@/lib/auth";

export type ReceiptLineItem = {
  name: string;
  quantity: number | null;
  unitPrice: string | null;
};

export type ReceiptMatchedOrder = {
  orderId: string;
  orderTitle: string;
  matchedItem: string;
  score: number;
};

export type ScanAndMatchResult =
  | { ok: true; orderNumber: string | null; matched: ReceiptMatchedOrder[]; items: ReceiptLineItem[] }
  | { ok: false; error: string };

export async function scanReceiptAndMatch(
  _formData: FormData,
): Promise<ScanAndMatchResult> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

export async function applyReceiptToOrders(
  _orderIds: string[],
  _orderNumber: string,
): Promise<{ ok: true; updatedCount: number } | { ok: false; error: string }> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

export async function scanReceiptForOrder(
  _orderId: string,
  _formData: FormData,
): Promise<{ ok: true; orderNumber: string | null; items: ReceiptLineItem[] } | { ok: false; error: string }> {
  await requireAdmin();
  return { ok: false, error: "This feature is being rebuilt." };
}

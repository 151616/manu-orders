"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { addDays } from "@/lib/eta";

export type ReceiptLineItem = {
  name: string;
  quantity: number | null;
  unitPrice: string | null;
};

export type ReceiptScanResult = {
  orderNumber: string | null;
  items: ReceiptLineItem[];
  raw: string;
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wordTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function matchScore(itemName: string, orderTitle: string): number {
  const itemTokens = wordTokens(itemName);
  const titleTokens = wordTokens(orderTitle);
  if (itemTokens.size === 0 || titleTokens.size === 0) return 0;
  let hits = 0;
  for (const tok of itemTokens) {
    if (titleTokens.has(tok)) hits++;
  }
  return hits / Math.max(itemTokens.size, titleTokens.size);
}

// ─── Receipt scanning via Gemini ───────────────────────────────────────────────

async function callGemini(fileBuffer: Buffer, mimeType: string): Promise<ReceiptScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  if (!isPdf && !isImage) {
    throw new Error("Only image files (PNG, JPG, WEBP) and PDFs are supported.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const base64 = fileBuffer.toString("base64");

  const prompt = `Extract the following from this order receipt or confirmation:
1. The overall order/confirmation number (e.g. "Order #12345", "PO 67890", "Confirmation: ABC-123")
2. Each line item with: product name, quantity, and unit price (if shown)

Respond ONLY with valid JSON in this exact format:
{
  "orderNumber": "12345" or null,
  "items": [
    { "name": "Product Name Here", "quantity": 2, "unitPrice": "$9.99" },
    ...
  ]
}

If you cannot find a field, use null. Do not include any text outside the JSON.`;

  const response = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    prompt,
  ]);

  const raw = response.response.text();

  // Extract JSON from the response (strip any markdown code fences if present)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse structured data from receipt.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    orderNumber?: string | null;
    items?: Array<{ name?: string; quantity?: number | null; unitPrice?: string | null }>;
  };

  return {
    orderNumber: parsed.orderNumber ?? null,
    items: (parsed.items ?? []).map((item) => ({
      name: item.name ?? "Unknown item",
      quantity: item.quantity ?? null,
      unitPrice: item.unitPrice ?? null,
    })),
    raw,
  };
}

// ─── Public server actions ─────────────────────────────────────────────────────

/**
 * Scan a receipt file and match extracted items to PENDING_ORDER orders.
 * Returns the scan result + matched orders for confirmation.
 */
export async function scanReceiptAndMatch(
  formData: FormData,
): Promise<ScanAndMatchResult> {
  await requireAdmin();

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max 20 MB." };
  }

  const mimeType = file.type || "application/octet-stream";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const scanResult = await callGemini(buffer, mimeType);

    // Load all PENDING_ORDER orders
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING_ORDER", isDeleted: false },
      select: { id: true, title: true },
    });

    // Match each receipt item to an order
    const matched: ReceiptMatchedOrder[] = [];
    const usedOrderIds = new Set<string>();

    for (const item of scanResult.items) {
      let bestOrder: (typeof pendingOrders)[number] | null = null;
      let bestScore = 0;

      for (const order of pendingOrders) {
        if (usedOrderIds.has(order.id)) continue;
        const score = matchScore(item.name, order.title);
        if (score > bestScore && score >= 0.25) {
          bestScore = score;
          bestOrder = order;
        }
      }

      if (bestOrder) {
        usedOrderIds.add(bestOrder.id);
        matched.push({
          orderId: bestOrder.id,
          orderTitle: bestOrder.title,
          matchedItem: item.name,
          score: bestScore,
        });
      }
    }

    return {
      ok: true,
      orderNumber: scanResult.orderNumber,
      matched,
      items: scanResult.items,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Receipt scan failed.";
    return { ok: false, error: message };
  }
}

/**
 * Apply a scanned receipt's order number to a list of matched order IDs.
 * Flips each matched PENDING_ORDER to NEW and sets the order number.
 */
export async function applyReceiptToOrders(
  orderIds: string[],
  orderNumber: string,
): Promise<{ ok: true; updatedCount: number } | { ok: false; error: string }> {
  await requireAdmin();

  if (!orderNumber.trim()) {
    return { ok: false, error: "Order number is required." };
  }

  if (orderIds.length === 0) {
    return { ok: false, error: "No orders selected." };
  }

  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, status: "PENDING_ORDER", isDeleted: false },
    });

    await prisma.$transaction(
      orders.map((order) =>
        prisma.order.update({
          where: { id: order.id },
          data: {
            orderNumber: orderNumber.trim(),
            status: "NEW",
            etaTargetDate: addDays(new Date(), order.etaDays),
          },
        }),
      ),
    );

    revalidatePath("/queue");
    for (const order of orders) {
      revalidatePath(`/orders/${order.id}`);
    }

    return { ok: true, updatedCount: orders.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to apply receipt.";
    return { ok: false, error: message };
  }
}

/**
 * Apply a receipt scan to a single specific order (used from the order detail page).
 */
export async function scanReceiptForOrder(
  orderId: string,
  formData: FormData,
): Promise<{ ok: true; orderNumber: string | null; items: ReceiptLineItem[] } | { ok: false; error: string }> {
  await requireAdmin();

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max 20 MB." };
  }

  const mimeType = file.type || "application/octet-stream";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const scanResult = await callGemini(buffer, mimeType);

    // Apply the order number immediately if found
    if (scanResult.orderNumber) {
      const order = await prisma.order.findFirst({
        where: { id: orderId, status: "PENDING_ORDER", isDeleted: false },
      });

      if (order) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            orderNumber: scanResult.orderNumber,
            status: "NEW",
            etaTargetDate: addDays(new Date(), order.etaDays),
          },
        });
        revalidatePath("/queue");
        revalidatePath(`/orders/${orderId}`);
      }
    }

    return { ok: true, orderNumber: scanResult.orderNumber, items: scanResult.items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Receipt scan failed.";
    return { ok: false, error: message };
  }
}

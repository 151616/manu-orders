import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "\"\"";
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

function toCsvRow(values: unknown[]) {
  return values.map((value) => formatCsvValue(value)).join(",");
}

export async function GET() {
  const user = await getSession();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: "asc" }],
  });

  const header = [
    "id",
    "createdAt",
    "updatedAt",
    "title",
    "description",
    "requesterName",
    "vendor",
    "orderNumber",
    "orderUrl",
    "quantity",
    "category",
    "priority",
    "etaDays",
    "etaTargetDate",
    "status",
    "isDeleted",
    "notesFromManu",
    "createdByLabel",
  ];

  const lines = [
    toCsvRow(header),
    ...orders.map((order) =>
      toCsvRow([
        order.id,
        order.createdAt,
        order.updatedAt,
        order.title,
        order.description,
        order.requesterName,
        order.vendor,
        order.orderNumber,
        order.orderUrl,
        order.quantity,
        order.category,
        order.priority,
        order.etaDays,
        order.etaTargetDate,
        order.status,
        order.isDeleted,
        order.notesFromManu,
        order.createdByLabel,
      ]),
    ),
  ];

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvBody = `\uFEFF${lines.join("\n")}\n`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"orders-${timestamp}.csv\"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

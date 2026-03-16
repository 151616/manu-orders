import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsClient } from "./requests-client";
import type { SerializedOrderRequest, SerializedTrackingRequest } from "./requests-client";

export default async function RequestsPage() {
  const user = await requireAuth();
  const isAdmin = user.role === "ADMIN";

  const [orderRequests, trackingRequests] = await Promise.all([
    isAdmin
      ? prisma.orderRequest.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        })
      : prisma.orderRequest.findMany({
          where: { submittedByLabel: user.label },
          orderBy: { createdAt: "desc" },
        }),
    isAdmin
      ? prisma.trackingRequest.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        })
      : prisma.trackingRequest.findMany({
          where: { submittedByLabel: user.label },
          orderBy: { createdAt: "desc" },
        }),
  ]);

  const serializedOrders: SerializedOrderRequest[] = orderRequests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    submittedByLabel: r.submittedByLabel,
    rejectionReason: r.rejectionReason,
    title: r.title,
    description: r.description,
    requesterName: r.requesterName,
    vendor: r.vendor,
    orderUrl: r.orderUrl,
    orderNumber: r.orderNumber,
    quantity: r.quantity,
    category: r.category,
    priority: r.priority,
    etaDays: r.etaDays,
  }));

  const serializedTracking: SerializedTrackingRequest[] = trackingRequests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    submittedByLabel: r.submittedByLabel,
    rejectionReason: r.rejectionReason,
    title: r.title,
    description: r.description,
    type: r.type,
    otherType: r.otherType,
  }));

  return (
    <RequestsClient
      isAdmin={isAdmin}
      orderRequests={serializedOrders}
      trackingRequests={serializedTracking}
    />
  );
}

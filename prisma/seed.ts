import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

function createPrismaClient() {
  if (databaseUrl!.startsWith("file:")) {
    return new PrismaClient();
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const VIEWER_LABEL = "VIEWER:Viewer Demo";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_IN_MS);
}

async function main() {
  await prisma.orderActivity.deleteMany();
  await prisma.orderAttachment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.loginAttempt.deleteMany();

  await prisma.order.createMany({
    data: [
      {
        title: "Aluminum mounting plate",
        description: "Need 4 brackets for assembly fixture.",
        requesterName: "Requester Demo",
        vendor: "MetalFab Co",
        orderNumber: "MF-1001",
        orderUrl: "https://vendor.example/orders/MF-1001",
        quantity: 4,
        category: "CNC",
        priority: 5,
        etaDays: 3,
        etaTargetDate: daysFromNow(3),
        status: "IN_PROGRESS",
        notesFromManu: "Programming complete, machining in progress.",
        createdByLabel: VIEWER_LABEL,
      },
      {
        title: "3D printed cable strain relief",
        description: "Prototype for harness routing.",
        requesterName: "Requester Demo",
        vendor: "PrintHub",
        orderNumber: "PH-883",
        orderUrl: "https://vendor.example/orders/PH-883",
        quantity: 12,
        category: "PRINT_3D",
        priority: 2,
        etaDays: 7,
        etaTargetDate: daysFromNow(7),
        status: "QUEUED",
        createdByLabel: VIEWER_LABEL,
      },
      {
        title: "Laser-cut acrylic guard",
        description: "Safety shield revision B.",
        requesterName: "Requester Demo",
        vendor: "LaserWorks",
        orderNumber: "LW-2044",
        orderUrl: "https://vendor.example/orders/LW-2044",
        quantity: 2,
        category: "LASER",
        priority: 4,
        etaDays: 5,
        etaTargetDate: daysFromNow(5),
        status: "WAITING_ON_PARTS",
        notesFromManu: "Waiting for acrylic stock delivery.",
        createdByLabel: VIEWER_LABEL,
      },
      {
        title: "Control panel wiring harness",
        description: "New panel layout, rev 3.",
        requesterName: "Requester Demo",
        vendor: "ElectroBuild",
        orderNumber: "EB-7710",
        orderUrl: "https://vendor.example/orders/EB-7710",
        quantity: 1,
        category: "ELECTRICAL",
        priority: 3,
        etaDays: 10,
        etaTargetDate: daysFromNow(10),
        status: "NEW",
        createdByLabel: VIEWER_LABEL,
      },
      {
        title: "Subassembly kitting",
        description: "Prep hardware kits for pilot run.",
        requesterName: "Requester Demo",
        vendor: "In-house",
        quantity: 20,
        category: "ASSEMBLY",
        priority: 1,
        etaDays: 14,
        etaTargetDate: daysFromNow(14),
        status: "BLOCKED",
        notesFromManu: "Awaiting BOM clarification from engineering.",
        createdByLabel: VIEWER_LABEL,
      },
      {
        title: "Custom spacer washers",
        description: "Optional spacing pack, may cancel.",
        requesterName: "Requester Demo",
        vendor: "Fastener Depot",
        orderNumber: "FD-9920",
        orderUrl: "https://vendor.example/orders/FD-9920",
        quantity: 50,
        category: "OTHER",
        priority: 2,
        etaDays: 6,
        etaTargetDate: daysFromNow(6),
        status: "DONE",
        createdByLabel: VIEWER_LABEL,
      },
    ],
  });

  await prisma.bookmark.createMany({
    data: [
      {
        kind: "SITE",
        name: "REV Robotics Store",
        siteUrl: "https://www.revrobotics.com/",
        siteVendorHint: "REV Robotics",
        createdByLabel: VIEWER_LABEL,
      },
      {
        kind: "SITE",
        name: "McMaster-Carr",
        siteUrl: "https://www.mcmaster.com/",
        siteVendorHint: "McMaster-Carr",
        createdByLabel: VIEWER_LABEL,
      },
      {
        kind: "TEMPLATE",
        name: "Standard CNC Bracket",
        defaultVendor: "MetalFab Co",
        defaultOrderUrl: "https://vendor.example/metal-fab",
        defaultCategory: "CNC",
        defaultDescription: "Default bracket profile for fixture updates.",
        createdByLabel: VIEWER_LABEL,
      },
      {
        kind: "TEMPLATE",
        name: "Prototype Print Job",
        defaultVendor: "PrintHub",
        defaultOrderUrl: "https://vendor.example/print-hub",
        defaultCategory: "PRINT_3D",
        defaultDescription: "Fast turnaround PLA prototype.",
        createdByLabel: VIEWER_LABEL,
      },
      {
        kind: "TEMPLATE",
        name: "Electrical Harness Order",
        defaultVendor: "ElectroBuild",
        defaultOrderUrl: "https://vendor.example/electro-build",
        defaultCategory: "ELECTRICAL",
        defaultDescription: "Preferred vendor for control cabinet wiring.",
        createdByLabel: VIEWER_LABEL,
      },
    ],
  });

  const seededOrders = await prisma.order.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  await prisma.orderActivity.createMany({
    data: seededOrders.map((order) => ({
      orderId: order.id,
      role: "VIEWER",
      action: "ORDER_SEEDED",
      details: JSON.stringify({
        summary: `Seeded order: ${order.title}`,
        diffs: [],
      }),
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

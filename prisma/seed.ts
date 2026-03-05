import { PrismaLibSql } from "@prisma/adapter-libsql";
import { OrderCategory, OrderStatus, PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaLibSql({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const REQUESTER_LABEL = "REQUESTER:Requester Demo";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_IN_MS);
}

async function main() {
  await prisma.orderActivity.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.loginAttempt.deleteMany();

  await prisma.order.createMany({
    data: [
      {
        title: "Aluminum mounting plate",
        description: "Need 4 brackets for assembly fixture.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "MetalFab Co",
        orderNumber: "MF-1001",
        orderUrl: "https://vendor.example/orders/MF-1001",
        quantity: 4,
        category: OrderCategory.CNC,
        priority: 5,
        etaDays: 3,
        etaTargetDate: daysFromNow(3),
        status: OrderStatus.IN_PROGRESS,
        notesFromManu: "Programming complete, machining in progress.",
        createdByLabel: REQUESTER_LABEL,
      },
      {
        title: "3D printed cable strain relief",
        description: "Prototype for harness routing.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "PrintHub",
        orderNumber: "PH-883",
        orderUrl: "https://vendor.example/orders/PH-883",
        quantity: 12,
        category: OrderCategory.PRINT_3D,
        priority: 2,
        etaDays: 7,
        etaTargetDate: daysFromNow(7),
        status: OrderStatus.QUEUED,
        createdByLabel: REQUESTER_LABEL,
      },
      {
        title: "Laser-cut acrylic guard",
        description: "Safety shield revision B.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "LaserWorks",
        orderNumber: "LW-2044",
        orderUrl: "https://vendor.example/orders/LW-2044",
        quantity: 2,
        category: OrderCategory.LASER,
        priority: 4,
        etaDays: 5,
        etaTargetDate: daysFromNow(5),
        status: OrderStatus.WAITING_ON_PARTS,
        notesFromManu: "Waiting for acrylic stock delivery.",
        createdByLabel: REQUESTER_LABEL,
      },
      {
        title: "Control panel wiring harness",
        description: "New panel layout, rev 3.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "ElectroBuild",
        orderNumber: "EB-7710",
        orderUrl: "https://vendor.example/orders/EB-7710",
        quantity: 1,
        category: OrderCategory.ELECTRICAL,
        priority: 3,
        etaDays: 10,
        etaTargetDate: daysFromNow(10),
        status: OrderStatus.NEW,
        createdByLabel: REQUESTER_LABEL,
      },
      {
        title: "Subassembly kitting",
        description: "Prep hardware kits for pilot run.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "In-house",
        quantity: 20,
        category: OrderCategory.ASSEMBLY,
        priority: 1,
        etaDays: 14,
        etaTargetDate: daysFromNow(14),
        status: OrderStatus.BLOCKED,
        notesFromManu: "Awaiting BOM clarification from engineering.",
        createdByLabel: REQUESTER_LABEL,
      },
      {
        title: "Custom spacer washers",
        description: "Optional spacing pack, may cancel.",
        requesterName: "Requester Demo",
        requesterContact: "requester@example.com",
        vendor: "Fastener Depot",
        orderNumber: "FD-9920",
        orderUrl: "https://vendor.example/orders/FD-9920",
        quantity: 50,
        category: OrderCategory.OTHER,
        priority: 2,
        etaDays: 6,
        etaTargetDate: daysFromNow(6),
        status: OrderStatus.DONE,
        createdByLabel: REQUESTER_LABEL,
      },
    ],
  });

  await prisma.bookmark.createMany({
    data: [
      {
        name: "Standard CNC Bracket",
        defaultVendor: "MetalFab Co",
        defaultOrderUrl: "https://vendor.example/metal-fab",
        defaultCategory: OrderCategory.CNC,
        defaultDescription: "Default bracket profile for fixture updates.",
        createdByLabel: REQUESTER_LABEL,
      },
      {
        name: "Prototype Print Job",
        defaultVendor: "PrintHub",
        defaultOrderUrl: "https://vendor.example/print-hub",
        defaultCategory: OrderCategory.PRINT_3D,
        defaultDescription: "Fast turnaround PLA prototype.",
        createdByLabel: REQUESTER_LABEL,
      },
      {
        name: "Electrical Harness Order",
        defaultVendor: "ElectroBuild",
        defaultOrderUrl: "https://vendor.example/electro-build",
        defaultCategory: OrderCategory.ELECTRICAL,
        defaultDescription: "Preferred vendor for control cabinet wiring.",
        createdByLabel: REQUESTER_LABEL,
      },
    ],
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

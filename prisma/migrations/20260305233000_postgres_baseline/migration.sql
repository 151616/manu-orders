-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrderCategory" AS ENUM ('CNC', 'PRINT_3D', 'LASER', 'ASSEMBLY', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'QUEUED', 'IN_PROGRESS', 'WAITING_ON_PARTS', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT,
    "vendor" TEXT,
    "orderNumber" TEXT,
    "orderUrl" TEXT,
    "quantity" INTEGER,
    "category" "OrderCategory" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "etaDays" INTEGER NOT NULL DEFAULT 10,
    "etaTargetDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "notesFromManu" TEXT,
    "createdByLabel" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultVendor" TEXT,
    "defaultOrderUrl" TEXT,
    "defaultCategory" "OrderCategory",
    "defaultDescription" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderActivity" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,

    CONSTRAINT "OrderActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAttachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'login',
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bookmark_createdByLabel_isDeleted_createdAt_idx" ON "Bookmark"("createdByLabel", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "OrderActivity_orderId_at_idx" ON "OrderActivity"("orderId", "at");

-- CreateIndex
CREATE INDEX "OrderActivity_role_at_idx" ON "OrderActivity"("role", "at");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAttachment_storagePath_key" ON "OrderAttachment"("storagePath");

-- CreateIndex
CREATE INDEX "OrderAttachment_orderId_createdAt_idx" ON "OrderAttachment"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_scope_ipAddress_createdAt_idx" ON "LoginAttempt"("scope", "ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttachment" ADD CONSTRAINT "OrderAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


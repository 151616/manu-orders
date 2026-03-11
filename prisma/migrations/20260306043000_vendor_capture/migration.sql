-- CreateTable
CREATE TABLE "VendorCapture" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByLabel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "vendorDomain" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "selectedItems" JSONB,

    CONSTRAINT "VendorCapture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorCapture_createdByLabel_createdAt_idx"
ON "VendorCapture"("createdByLabel", "createdAt");

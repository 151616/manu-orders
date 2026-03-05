-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT,
    "vendor" TEXT,
    "orderNumber" TEXT,
    "orderUrl" TEXT,
    "quantity" INTEGER,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "etaDays" INTEGER NOT NULL DEFAULT 10,
    "etaTargetDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notesFromManu" TEXT,
    "createdByUserId" TEXT,
    CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("category", "createdAt", "description", "etaDays", "etaTargetDate", "id", "notesFromManu", "orderNumber", "orderUrl", "priority", "quantity", "requesterContact", "requesterName", "status", "title", "updatedAt", "vendor") SELECT "category", "createdAt", "description", "etaDays", "etaTargetDate", "id", "notesFromManu", "orderNumber", "orderUrl", "priority", "quantity", "requesterContact", "requesterName", "status", "title", "updatedAt", "vendor" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");

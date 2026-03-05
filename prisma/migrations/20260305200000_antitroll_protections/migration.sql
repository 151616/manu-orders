-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Bookmark" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Redefine bookmark ownership index to include soft-delete state.
DROP INDEX IF EXISTS "Bookmark_createdByLabel_createdAt_idx";
CREATE INDEX "Bookmark_createdByLabel_isDeleted_createdAt_idx" ON "Bookmark"("createdByLabel", "isDeleted", "createdAt");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    CONSTRAINT "OrderActivity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderActivity" ("id", "orderId", "at", "role", "action", "details")
SELECT
    "id",
    "orderId",
    "createdAt",
    CASE
      WHEN "actorLabel" LIKE 'ADMIN:%' THEN 'ADMIN'
      WHEN "actorLabel" LIKE 'VIEWER:%' THEN 'VIEWER'
      ELSE 'UNKNOWN'
    END,
    "action",
    "details"
FROM "OrderActivity";
DROP TABLE "OrderActivity";
ALTER TABLE "new_OrderActivity" RENAME TO "OrderActivity";
CREATE INDEX "OrderActivity_orderId_at_idx" ON "OrderActivity"("orderId", "at");
CREATE INDEX "OrderActivity_role_at_idx" ON "OrderActivity"("role", "at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'login';

-- CreateIndex
CREATE INDEX "LoginAttempt_scope_ipAddress_createdAt_idx" ON "LoginAttempt"("scope", "ipAddress", "createdAt");

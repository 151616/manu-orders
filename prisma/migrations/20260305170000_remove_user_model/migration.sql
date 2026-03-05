-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Bookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "defaultVendor" TEXT,
    "defaultOrderUrl" TEXT,
    "defaultCategory" TEXT,
    "defaultDescription" TEXT,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bookmark" (
    "id",
    "name",
    "defaultVendor",
    "defaultOrderUrl",
    "defaultCategory",
    "defaultDescription",
    "createdByLabel",
    "createdAt",
    "updatedAt"
)
SELECT
    b."id",
    b."name",
    b."defaultVendor",
    b."defaultOrderUrl",
    b."defaultCategory",
    b."defaultDescription",
    COALESCE(u."role" || ':' || u."name", 'REQUESTER:Requester Demo'),
    b."createdAt",
    b."updatedAt"
FROM "Bookmark" AS b
LEFT JOIN "User" AS u ON u."id" = b."createdByUserId";
DROP TABLE "Bookmark";
ALTER TABLE "new_Bookmark" RENAME TO "Bookmark";
CREATE INDEX "Bookmark_createdByLabel_createdAt_idx" ON "Bookmark"("createdByLabel", "createdAt");

CREATE TABLE "new_OrderActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    CONSTRAINT "OrderActivity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrderActivity" (
    "id",
    "orderId",
    "actorLabel",
    "createdAt",
    "action",
    "details"
)
SELECT
    oa."id",
    oa."orderId",
    COALESCE(u."role" || ':' || u."name", 'UNKNOWN:Unknown Actor'),
    oa."createdAt",
    oa."action",
    oa."details"
FROM "OrderActivity" AS oa
LEFT JOIN "User" AS u ON u."id" = oa."userId";
DROP TABLE "OrderActivity";
ALTER TABLE "new_OrderActivity" RENAME TO "OrderActivity";
CREATE INDEX "OrderActivity_orderId_createdAt_idx" ON "OrderActivity"("orderId", "createdAt");
CREATE INDEX "OrderActivity_actorLabel_idx" ON "OrderActivity"("actorLabel");

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
    "createdByLabel" TEXT
);
INSERT INTO "new_Order" (
    "id",
    "createdAt",
    "updatedAt",
    "title",
    "description",
    "requesterName",
    "requesterContact",
    "vendor",
    "orderNumber",
    "orderUrl",
    "quantity",
    "category",
    "priority",
    "etaDays",
    "etaTargetDate",
    "status",
    "notesFromManu",
    "createdByLabel"
)
SELECT
    o."id",
    o."createdAt",
    o."updatedAt",
    o."title",
    o."description",
    o."requesterName",
    o."requesterContact",
    o."vendor",
    o."orderNumber",
    o."orderUrl",
    o."quantity",
    o."category",
    o."priority",
    o."etaDays",
    o."etaTargetDate",
    o."status",
    o."notesFromManu",
    CASE
        WHEN o."createdByUserId" IS NULL THEN NULL
        ELSE COALESCE(u."role" || ':' || u."name", 'UNKNOWN:Unknown Creator')
    END
FROM "Order" AS o
LEFT JOIN "User" AS u ON u."id" = o."createdByUserId";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

DROP TABLE "User";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

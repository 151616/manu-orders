-- AlterTable
ALTER TABLE "Order" ADD COLUMN "etaTargetDate" DATETIME;

-- Backfill target date for existing rows using current etaDays value.
UPDATE "Order"
SET "etaTargetDate" = datetime('now', '+' || "etaDays" || ' days')
WHERE "etaTargetDate" IS NULL;

-- CreateEnum
CREATE TYPE "BookmarkKind" AS ENUM ('TEMPLATE', 'SITE');

-- AlterTable
ALTER TABLE "Bookmark"
ADD COLUMN "kind" "BookmarkKind" NOT NULL DEFAULT 'TEMPLATE',
ADD COLUMN "siteUrl" TEXT,
ADD COLUMN "siteVendorHint" TEXT;

-- DropIndex
DROP INDEX "Bookmark_createdByLabel_isDeleted_createdAt_idx";

-- CreateIndex
CREATE INDEX "Bookmark_createdByLabel_isDeleted_kind_createdAt_idx"
ON "Bookmark"("createdByLabel", "isDeleted", "kind", "createdAt");

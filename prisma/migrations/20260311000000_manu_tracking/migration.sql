-- CreateEnum
CREATE TYPE "ManuRequestType" AS ENUM ('CNC', 'DRILL', 'TAP', 'CUT', 'OTHER');

-- CreateTable
CREATE TABLE "ManuRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ManuRequestType" NOT NULL,
    "otherType" TEXT,
    "fileStoragePath" TEXT,
    "fileOriginalName" TEXT,
    "fileContentType" TEXT,
    "fileSizeBytes" INTEGER,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "createdByLabel" TEXT NOT NULL,

    CONSTRAINT "ManuRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManuRequest_isFinished_createdAt_idx" ON "ManuRequest"("isFinished", "createdAt");

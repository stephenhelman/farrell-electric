-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('SITE_SETTINGS', 'HOME', 'PAGE', 'LEGAL', 'FINANCING');

-- CreateTable
CREATE TABLE "ContentDocument" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentField" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentDocument_type_slug_key" ON "ContentDocument"("type", "slug");

-- CreateIndex
CREATE INDEX "ContentField_documentId_order_idx" ON "ContentField"("documentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ContentField_documentId_key_key" ON "ContentField"("documentId", "key");

-- AddForeignKey
ALTER TABLE "ContentField" ADD CONSTRAINT "ContentField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;


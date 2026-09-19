-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "ghlCustomObjectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_ghlCustomObjectId_key" ON "Quote"("ghlCustomObjectId");


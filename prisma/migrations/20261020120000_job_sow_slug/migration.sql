-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "sowSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_sowSlug_key" ON "Job"("sowSlug");

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "payToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_payToken_key" ON "Job"("payToken");

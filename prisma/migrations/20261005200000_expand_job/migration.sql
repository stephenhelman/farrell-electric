-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CARD', 'CHECK', 'CASH', 'FINANCING', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('NONE', 'SENT', 'SIGNED');

-- Hand-edited: rename (not drop + add) installDate -> installScheduledDate.
ALTER TABLE "Job" RENAME COLUMN "installDate" TO "installScheduledDate";

-- AlterTable
ALTER TABLE "Job"
ADD COLUMN     "actualCost" DECIMAL(65,30),
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "contractSentAt" TIMESTAMP(3),
ADD COLUMN     "contractSignedAt" TIMESTAMP(3),
ADD COLUMN     "contractStatus" "ContractStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "depositAmount" DECIMAL(65,30),
ADD COLUMN     "depositPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "depositPaidAt" TIMESTAMP(3),
ADD COLUMN     "depositRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalInvoicePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalInvoicePaidAt" TIMESTAMP(3),
ADD COLUMN     "installedDate" TIMESTAMP(3),
ADD COLUMN     "paymentType" "PaymentType",
ADD COLUMN     "revenue" DECIMAL(65,30);

-- Hand-edited: revenue is NOT NULL, defaulting from the accepted quote's total.
-- Added nullable, backfilled from Quote.total, then constrained, so this is
-- valid whether or not any Job rows exist.
UPDATE "Job" SET "revenue" = "Quote"."total" FROM "Quote" WHERE "Quote"."id" = "Job"."quoteId";
ALTER TABLE "Job" ALTER COLUMN "revenue" SET NOT NULL;

-- CreateEnum
CREATE TYPE "QuoteDeclineReason" AS ENUM ('PRICE_TOO_HIGH', 'LOST_TO_COMPETITOR', 'TIMING', 'SCOPE_CHANGED', 'FINANCING', 'NO_RESPONSE', 'OTHER');

-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "declineReason" "QuoteDeclineReason",
ADD COLUMN     "declineReasonDetail" TEXT;

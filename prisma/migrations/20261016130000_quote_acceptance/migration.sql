-- CreateEnum
CREATE TYPE "QuoteAcceptanceSource" AS ENUM ('CUSTOMER', 'REP');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedSource" "QuoteAcceptanceSource";

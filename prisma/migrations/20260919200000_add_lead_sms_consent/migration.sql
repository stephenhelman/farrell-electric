-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "smsConsentTransactional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsConsentPromotional" BOOLEAN NOT NULL DEFAULT false;

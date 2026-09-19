-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('LIGHTING', 'ELECTRICAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'SYNCED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "leadType" "LeadType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'contact_form',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "propertyAddress" TEXT,
    "details" JSONB NOT NULL,
    "ghlContactId" TEXT,
    "ghlOpportunityId" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

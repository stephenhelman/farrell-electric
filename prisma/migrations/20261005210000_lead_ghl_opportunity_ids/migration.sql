-- Lead owns all GHL ids. Rename (not drop/add) to preserve any existing value.
ALTER TABLE "Lead" RENAME COLUMN "ghlOpportunityId" TO "ghlSalesOpportunityId";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "ghlOpsOpportunityId" TEXT;

-- Quote.ghlOpportunityId had no reader; quotes read the sales opp via the lead.
ALTER TABLE "Quote" DROP COLUMN "ghlOpportunityId";

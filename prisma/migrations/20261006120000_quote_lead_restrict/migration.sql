-- A lead that has quotes can no longer be deleted (was SET NULL, which orphaned the quotes).
-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_leadId_fkey";

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

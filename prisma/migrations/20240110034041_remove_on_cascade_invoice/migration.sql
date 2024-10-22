-- DropForeignKey
ALTER TABLE "LegalInvoice" DROP CONSTRAINT "LegalInvoice_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "LegalPosInvoice_createdAt_idx";

-- CreateIndex
CREATE INDEX "LegalPosInvoice_createdAt_subOrganizationId_cashierId_idx" ON "LegalPosInvoice"("createdAt", "subOrganizationId", "cashierId");

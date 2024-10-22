-- DropIndex
DROP INDEX "LegalInvoice_createdAt_idx";

-- DropIndex
DROP INDEX "LegalInvoiceProduct_cost_idx";

-- DropIndex
DROP INDEX "LegalInvoiceRemision_createdAt_idx";

-- CreateIndex
CREATE INDEX "LegalInvoice_createdAt_subOrganizationId_idx" ON "LegalInvoice"("createdAt", "subOrganizationId");

-- CreateIndex
CREATE INDEX "LegalInvoiceProduct_cost_legalPosInvoiceId_legalInvoiceId_l_idx" ON "LegalInvoiceProduct"("cost", "legalPosInvoiceId", "legalInvoiceId", "legalInvoiceRemisionId");

-- CreateIndex
CREATE INDEX "LegalInvoiceRemision_createdAt_subOrganizationId_idx" ON "LegalInvoiceRemision"("createdAt", "subOrganizationId");

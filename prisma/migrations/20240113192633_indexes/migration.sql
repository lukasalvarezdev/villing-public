-- CreateIndex
CREATE INDEX "LegalInvoice_createdAt_idx" ON "LegalInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "LegalInvoiceProduct_cost_idx" ON "LegalInvoiceProduct"("cost");

-- CreateIndex
CREATE INDEX "LegalInvoiceRemision_createdAt_idx" ON "LegalInvoiceRemision"("createdAt");

-- CreateIndex
CREATE INDEX "LegalPosInvoice_createdAt_idx" ON "LegalPosInvoice"("createdAt");

/*
  Warnings:

  - A unique constraint covering the columns `[purchaseId]` on the table `PurchaseInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[purchaseRemisionId]` on the table `PurchaseInvoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[purchaseId]` on the table `PurchaseRemision` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_purchaseId_key" ON "PurchaseInvoice"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_purchaseRemisionId_key" ON "PurchaseInvoice"("purchaseRemisionId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRemision_purchaseId_key" ON "PurchaseRemision"("purchaseId");

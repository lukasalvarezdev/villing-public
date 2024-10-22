/*
  Warnings:

  - You are about to drop the column `creditNoteId` on the `LegalInvoiceProduct` table. All the data in the column will be lost.
  - You are about to drop the column `debitNoteId` on the `LegalInvoiceProduct` table. All the data in the column will be lost.
  - You are about to drop the `CreditNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DebitNote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CreditNote" DROP CONSTRAINT "CreditNote_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "CreditNote" DROP CONSTRAINT "CreditNote_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DebitNote" DROP CONSTRAINT "DebitNote_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "DebitNote" DROP CONSTRAINT "DebitNote_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoice" DROP CONSTRAINT "LegalInvoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoice" DROP CONSTRAINT "LegalInvoice_resolutionId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoice" DROP CONSTRAINT "LegalInvoice_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoice" DROP CONSTRAINT "LegalInvoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoiceProduct" DROP CONSTRAINT "LegalInvoiceProduct_creditNoteId_fkey";

-- DropForeignKey
ALTER TABLE "LegalInvoiceProduct" DROP CONSTRAINT "LegalInvoiceProduct_debitNoteId_fkey";

-- DropForeignKey
ALTER TABLE "LegalPosInvoice" DROP CONSTRAINT "LegalPosInvoice_cashierId_fkey";

-- DropForeignKey
ALTER TABLE "LegalPosInvoice" DROP CONSTRAINT "LegalPosInvoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "LegalPosInvoice" DROP CONSTRAINT "LegalPosInvoice_resolutionId_fkey";

-- DropForeignKey
ALTER TABLE "LegalPosInvoice" DROP CONSTRAINT "LegalPosInvoice_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "LegalPosInvoice" DROP CONSTRAINT "LegalPosInvoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_purchaseRemisionId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseInvoice" DROP CONSTRAINT "PurchaseInvoice_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRemision" DROP CONSTRAINT "PurchaseRemision_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRemision" DROP CONSTRAINT "PurchaseRemision_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRemision" DROP CONSTRAINT "PurchaseRemision_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseRemision" DROP CONSTRAINT "PurchaseRemision_userId_fkey";

-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_subOrganizationId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" DROP COLUMN "creditNoteId",
DROP COLUMN "debitNoteId";

-- DropTable
DROP TABLE "CreditNote";

-- DropTable
DROP TABLE "DebitNote";

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRemision" ADD CONSTRAINT "PurchaseRemision_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRemision" ADD CONSTRAINT "PurchaseRemision_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRemision" ADD CONSTRAINT "PurchaseRemision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRemision" ADD CONSTRAINT "PurchaseRemision_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_purchaseRemisionId_fkey" FOREIGN KEY ("purchaseRemisionId") REFERENCES "PurchaseRemision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

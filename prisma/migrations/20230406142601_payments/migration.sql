/*
  Warnings:

  - You are about to drop the column `purchaseId` on the `PurchasePayment` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseRemisionId` on the `PurchasePayment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PurchasePayment" DROP CONSTRAINT "PurchasePayment_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "PurchasePayment" DROP CONSTRAINT "PurchasePayment_purchaseInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PurchasePayment" DROP CONSTRAINT "PurchasePayment_purchaseRemisionId_fkey";

-- AlterTable
ALTER TABLE "PurchasePayment" DROP COLUMN "purchaseId",
DROP COLUMN "purchaseRemisionId";

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

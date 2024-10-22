/*
  Warnings:

  - Made the column `productId` on table `LegalInvoiceProduct` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "LegalInvoiceProduct" DROP CONSTRAINT "LegalInvoiceProduct_productId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ALTER COLUMN "productId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

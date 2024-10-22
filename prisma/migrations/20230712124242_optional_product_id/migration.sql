-- DropForeignKey
ALTER TABLE "LegalInvoiceProduct" DROP CONSTRAINT "LegalInvoiceProduct_productId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

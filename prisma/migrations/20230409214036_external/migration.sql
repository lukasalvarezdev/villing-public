-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "externalInvoiceId" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "externalInvoiceId" TEXT DEFAULT '';

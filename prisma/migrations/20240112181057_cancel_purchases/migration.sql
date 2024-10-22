-- AlterTable
ALTER TABLE "LegalInvoiceRemision" ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "canceledAt" TIMESTAMP(3);

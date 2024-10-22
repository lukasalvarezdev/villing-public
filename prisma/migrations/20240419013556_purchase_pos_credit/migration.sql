-- AlterTable
ALTER TABLE "LegalPosInvoice" ADD COLUMN     "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "type" "LegalInvoiceType" NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "type" "LegalInvoiceType" NOT NULL DEFAULT 'cash';

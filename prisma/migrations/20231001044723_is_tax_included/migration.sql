-- AlterTable
ALTER TABLE "LegalPosInvoice" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "QuoteInvoice" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

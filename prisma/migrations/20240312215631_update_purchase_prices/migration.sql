-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "updatePrices" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "updatePrices" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "updatePrices" BOOLEAN NOT NULL DEFAULT false;

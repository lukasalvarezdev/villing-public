-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "retention" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "retention" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "retention" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "retentionJson" JSONB;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "retentionJson" JSONB;

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN     "retentionJson" JSONB;

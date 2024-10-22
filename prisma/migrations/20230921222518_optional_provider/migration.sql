-- AlterTable
ALTER TABLE "InvoiceReceipt" ADD COLUMN     "number" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "providerId" DROP NOT NULL;

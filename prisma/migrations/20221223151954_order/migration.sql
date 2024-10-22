-- AlterTable
ALTER TABLE "Counts" ADD COLUMN     "ordersCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "internalId" INTEGER NOT NULL DEFAULT 0;

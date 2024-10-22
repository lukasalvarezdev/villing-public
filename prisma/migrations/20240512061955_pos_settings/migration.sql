-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "applyDiscountToTotalInPos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatePricesOnPurchases" BOOLEAN NOT NULL DEFAULT false;

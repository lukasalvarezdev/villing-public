-- AlterTable
ALTER TABLE "Cashier" RENAME COLUMN "totalByUserCard" TO "totalBySystemCard";
ALTER TABLE "Cashier" RENAME COLUMN "totalByUserCash" TO "totalBySystemCash";
ALTER TABLE "Cashier" RENAME COLUMN "totalByUserTransfer" TO "totalBySystemTransfer";

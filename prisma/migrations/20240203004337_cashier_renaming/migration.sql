/*
  Warnings:
  - You are about to drop the column `finalBalance` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `incomeInCheck` on the `Cashier` table. All the data in the column will be lost.
*/

ALTER TABLE "Cashier" RENAME COLUMN "expenses" TO "totalExpenses";
ALTER TABLE "Cashier" RENAME COLUMN "incomeInCard" TO "totalByUserCard";
ALTER TABLE "Cashier" RENAME COLUMN "incomeInCash" TO "totalByUserCash";
ALTER TABLE "Cashier" RENAME COLUMN "incomeInTransfers" TO "totalByUserTransfer";
ALTER TABLE "Cashier" RENAME COLUMN "invalidatedIncome" TO "totalCanceledIncome";
ALTER TABLE "Cashier" RENAME COLUMN "invalidatedSales" TO "canceledSalesCount";

ALTER TABLE "Cashier" ADD COLUMN "totalBySystemCard" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Cashier" ADD COLUMN "totalBySystemCash" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Cashier" ADD COLUMN "totalBySystemTransfer" DOUBLE PRECISION NOT NULL DEFAULT 0;


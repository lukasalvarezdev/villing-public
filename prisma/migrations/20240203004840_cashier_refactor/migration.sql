/*
  Warnings:

  - You are about to drop the column `finalBalance` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `incomeInCheck` on the `Cashier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cashier" DROP COLUMN "finalBalance",
DROP COLUMN "incomeInCheck";

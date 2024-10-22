/*
  Warnings:

  - You are about to drop the column `totalBySystemCard` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `totalBySystemCash` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `totalBySystemTransfer` on the `Cashier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cashier" DROP COLUMN "totalBySystemCard",
DROP COLUMN "totalBySystemCash",
DROP COLUMN "totalBySystemTransfer";

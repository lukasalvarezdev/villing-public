/*
  Warnings:

  - You are about to drop the column `inventoryReportsCount` on the `Counts` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryTransfersCount` on the `Counts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Counts" DROP COLUMN "inventoryReportsCount",
DROP COLUMN "inventoryTransfersCount",
ADD COLUMN     "creditNotesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "debitNotesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expensesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inventoryPriceSettingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceRemisionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "legalPosInvoicesCount" INTEGER NOT NULL DEFAULT 0;

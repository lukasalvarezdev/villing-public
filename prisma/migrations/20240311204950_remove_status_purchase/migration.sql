/*
  Warnings:

  - You are about to drop the column `paidWithCash` on the `PurchaseInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PurchaseInvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PurchaseInvoice" DROP COLUMN "paidWithCash",
DROP COLUMN "status";

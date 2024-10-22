/*
  Warnings:

  - You are about to drop the column `dianId` on the `LegalInvoiceRemision` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LegalInvoiceRemision_dianId_key";

-- AlterTable
ALTER TABLE "LegalInvoiceRemision" DROP COLUMN "dianId";

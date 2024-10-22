/*
  Warnings:

  - You are about to drop the column `taxIncluded` on the `LegalInvoiceRemision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LegalInvoiceRemision" DROP COLUMN "taxIncluded",
ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT true;

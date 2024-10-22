/*
  Warnings:

  - You are about to drop the column `legalInvoiceJson` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LegalInvoice" ADD COLUMN     "legalInvoiceJson" TEXT DEFAULT '{}';

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "legalInvoiceJson";

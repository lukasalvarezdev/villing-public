/*
  Warnings:

  - Made the column `externalInvoiceId` on table `PurchaseInvoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `externalInvoiceId` on table `PurchaseRemision` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PurchaseInvoice" ALTER COLUMN "externalInvoiceId" SET NOT NULL,
ALTER COLUMN "externalInvoiceId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseRemision" ALTER COLUMN "externalInvoiceId" SET NOT NULL,
ALTER COLUMN "externalInvoiceId" DROP DEFAULT;

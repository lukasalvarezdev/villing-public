/*
  Warnings:

  - You are about to drop the column `status` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `LegalInvoiceRemision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LegalInvoice" DROP COLUMN "status",
ADD COLUMN     "pending" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LegalInvoiceRemision" DROP COLUMN "status",
ADD COLUMN     "pending" DOUBLE PRECISION NOT NULL DEFAULT 0;

/*
  Warnings:

  - Added the required column `providerId` to the `InvoiceReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InvoiceReceipt" ADD COLUMN     "providerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "InvoiceReceipt" ADD CONSTRAINT "InvoiceReceipt_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

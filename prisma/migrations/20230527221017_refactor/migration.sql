/*
  Warnings:

  - You are about to drop the column `dianConsecutive` on the `LegalPosInvoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dianId]` on the table `LegalPosInvoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LegalPosInvoice" DROP COLUMN "dianConsecutive",
ADD COLUMN     "dianId" TEXT,
ALTER COLUMN "internalId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LegalPosInvoicePaymentForm" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash',
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LegalPosInvoice_dianId_key" ON "LegalPosInvoice"("dianId");

/*
  Warnings:

  - You are about to drop the column `legalInvoiceRemisionId` on the `LegalInvoicePaymentForm` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "LegalInvoicePaymentForm" DROP CONSTRAINT "LegalInvoicePaymentForm_legalInvoiceRemisionId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" DROP COLUMN "legalInvoiceRemisionId";

-- CreateTable
CREATE TABLE "LegalInvoiceRemisionPaymentForm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalInvoiceRemisionId" INTEGER NOT NULL,
    "paymentMethod" "LegalInvoicePaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LegalInvoiceRemisionPaymentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoiceRemisionPaymentForm" ADD CONSTRAINT "LegalInvoiceRemisionPaymentForm_legalInvoiceRemisionId_fkey" FOREIGN KEY ("legalInvoiceRemisionId") REFERENCES "LegalInvoiceRemision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

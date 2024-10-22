/*
  Warnings:

  - You are about to drop the column `creditNoteId` on the `LegalInvoicePaymentForm` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "LegalInvoicePaymentForm" DROP CONSTRAINT "LegalInvoicePaymentForm_creditNoteId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" DROP COLUMN "creditNoteId";

-- CreateTable
CREATE TABLE "CreditNotePaymentForm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creditNoteId" INTEGER NOT NULL,
    "paymentMethod" "LegalInvoicePaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CreditNotePaymentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditNotePaymentForm" ADD CONSTRAINT "CreditNotePaymentForm_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

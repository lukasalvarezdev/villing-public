-- CreateEnum
CREATE TYPE "debitNoteCorrectionsType" AS ENUM ('interest', 'expenses', 'valueChange', 'other');

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "debitNoteId" INTEGER;

-- CreateTable
CREATE TABLE "DebitNote" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "totalTax" INTEGER NOT NULL,
    "totalDiscount" INTEGER NOT NULL,
    "notes" TEXT,
    "reason" "debitNoteCorrectionsType" NOT NULL DEFAULT 'interest',
    "legalInvoiceJson" JSONB,
    "cude" TEXT,
    "zipKey" TEXT,
    "pdfObjectId" TEXT,

    CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebitNotePaymentForm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "debitNoteId" INTEGER NOT NULL,
    "paymentMethod" "LegalInvoicePaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DebitNotePaymentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNotePaymentForm" ADD CONSTRAINT "DebitNotePaymentForm_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "DebitNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "DebitNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

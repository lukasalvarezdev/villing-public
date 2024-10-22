-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" ADD COLUMN     "creditNoteId" INTEGER;

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "creditNoteId" INTEGER;

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "totalTax" INTEGER NOT NULL,
    "totalDiscount" INTEGER NOT NULL,
    "notes" TEXT,
    "legalInvoiceJson" JSONB,
    "cude" TEXT,
    "zipKey" TEXT,
    "pdfObjectId" TEXT,
    "wasEmailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoicePaymentForm" ADD CONSTRAINT "LegalInvoicePaymentForm_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

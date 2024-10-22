-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "debitNoteId" INTEGER;

-- CreateTable
CREATE TABLE "DebitNote" (
    "id" SERIAL NOT NULL,
    "DianConsecutive" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "totalTaxes" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "DebitNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

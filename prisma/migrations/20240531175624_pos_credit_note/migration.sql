-- AlterTable
ALTER TABLE "CreditNotePaymentForm" ADD COLUMN     "legalCreditNoteId" TEXT;

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "legalCreditNoteId" TEXT;

-- CreateTable
CREATE TABLE "LegalCreditNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalJson" JSONB,
    "cude" TEXT,
    "zipKey" TEXT,
    "wasEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "reason" "creditNoteCorrectionsType" NOT NULL DEFAULT 'return',
    "prefix" TEXT,
    "numeration" INTEGER,
    "total" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "totalTax" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "posId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "LegalCreditNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalCreditNote" ADD CONSTRAINT "LegalCreditNote_posId_fkey" FOREIGN KEY ("posId") REFERENCES "LegalPosInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCreditNote" ADD CONSTRAINT "LegalCreditNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCreditNote" ADD CONSTRAINT "LegalCreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNotePaymentForm" ADD CONSTRAINT "CreditNotePaymentForm_legalCreditNoteId_fkey" FOREIGN KEY ("legalCreditNoteId") REFERENCES "LegalCreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_legalCreditNoteId_fkey" FOREIGN KEY ("legalCreditNoteId") REFERENCES "LegalCreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

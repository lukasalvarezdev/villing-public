-- CreateTable
CREATE TABLE "LegalInvoicePaymentTerm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalInvoiceId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "term" INTEGER NOT NULL,

    CONSTRAINT "LegalInvoicePaymentTerm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoicePaymentTerm" ADD CONSTRAINT "LegalInvoicePaymentTerm_legalInvoiceId_fkey" FOREIGN KEY ("legalInvoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

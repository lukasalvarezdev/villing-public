-- CreateTable
CREATE TABLE "LegalPosInvoicePaymentForm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalPosInvoiceId" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LegalPosInvoicePaymentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalPosInvoicePaymentForm" ADD CONSTRAINT "LegalPosInvoicePaymentForm_legalPosInvoiceId_fkey" FOREIGN KEY ("legalPosInvoiceId") REFERENCES "LegalPosInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

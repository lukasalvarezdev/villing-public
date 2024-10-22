-- CreateTable
CREATE TABLE "LegalInvoicePayment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalInvoiceId" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LegalInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoicePayment" ADD CONSTRAINT "LegalInvoicePayment_legalInvoiceId_fkey" FOREIGN KEY ("legalInvoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

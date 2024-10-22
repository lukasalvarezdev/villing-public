-- CreateTable
CREATE TABLE "InvoiceRemisionPayment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceRemisionId" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "InvoiceRemisionPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceRemisionPayment" ADD CONSTRAINT "InvoiceRemisionPayment_invoiceRemisionId_fkey" FOREIGN KEY ("invoiceRemisionId") REFERENCES "LegalInvoiceRemision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

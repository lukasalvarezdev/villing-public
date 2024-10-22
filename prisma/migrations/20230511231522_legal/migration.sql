-- CreateEnum
CREATE TYPE "LegalInvoicePaymentMethod" AS ENUM ('cash', 'card', 'transfer');

-- CreateTable
CREATE TABLE "LegalInvoicePaymentForm" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalInvoiceId" INTEGER NOT NULL,
    "paymentMethod" "LegalInvoicePaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LegalInvoicePaymentForm_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoicePaymentForm" ADD CONSTRAINT "LegalInvoicePaymentForm_legalInvoiceId_fkey" FOREIGN KEY ("legalInvoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

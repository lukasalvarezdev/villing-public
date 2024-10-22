-- AlterTable
ALTER TABLE "LegalPosInvoice" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PosInvoicePayment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "invoiceId" INTEGER NOT NULL,

    CONSTRAINT "PosInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRemisionPayment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "remisionId" INTEGER,

    CONSTRAINT "PurchaseRemisionPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PosInvoicePayment" ADD CONSTRAINT "PosInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "LegalPosInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRemisionPayment" ADD CONSTRAINT "PurchaseRemisionPayment_remisionId_fkey" FOREIGN KEY ("remisionId") REFERENCES "PurchaseRemision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

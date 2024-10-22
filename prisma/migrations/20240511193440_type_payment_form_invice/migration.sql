-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash',
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash';

-- AlterTable
ALTER TABLE "LegalInvoiceRemisionPaymentForm" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash',
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash';

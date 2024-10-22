-- AlterTable
ALTER TABLE "CreditNotePaymentForm" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash',
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash';

-- AlterTable
ALTER TABLE "DebitNotePaymentForm" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash',
ALTER COLUMN "paymentMethod" SET DEFAULT 'cash';

-- AlterTable
ALTER TABLE "LegalInvoiceRemision" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" "LegalInvoiceStatus" NOT NULL DEFAULT 'paid',
ADD COLUMN     "type" "LegalInvoiceType" NOT NULL DEFAULT 'cash';

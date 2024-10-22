-- AlterTable
ALTER TABLE "InvoiceSelection" ADD COLUMN     "creditNote" JSONB,
ADD COLUMN     "debitNote" JSONB,
ADD COLUMN     "inventoryPriceSetting" JSONB,
ADD COLUMN     "inventorySetting" JSONB,
ADD COLUMN     "legalInvoice" JSONB,
ADD COLUMN     "legalInvoiceRemision" JSONB,
ADD COLUMN     "legalPosInvoice" JSONB,
ADD COLUMN     "purchase" JSONB,
ADD COLUMN     "purchaseInvoice" JSONB,
ADD COLUMN     "purchaseRemision" JSONB,
ADD COLUMN     "quoteInvoice" JSONB;

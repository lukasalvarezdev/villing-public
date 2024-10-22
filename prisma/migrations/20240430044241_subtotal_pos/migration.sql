-- Rename the existing column
ALTER TABLE "LegalPosInvoice"
RENAME COLUMN "totalTaxes" TO "totalTax";

-- Add a new column with a different name
ALTER TABLE "LegalPosInvoice"
ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

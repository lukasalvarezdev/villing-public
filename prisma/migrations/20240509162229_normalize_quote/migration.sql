/*
  Warnings:

  - You are about to drop the column `total` on the `CreditNote` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `DebitNote` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditNote" DROP COLUMN "total";

-- AlterTable
ALTER TABLE "DebitNote" DROP COLUMN "total";

-- AlterTable
ALTER TABLE "LegalInvoicePayment" ADD COLUMN     "type" "LegalInvoicePaymentMethod" NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE "QuoteInvoice" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "type" "LegalInvoiceType" NOT NULL DEFAULT 'cash';

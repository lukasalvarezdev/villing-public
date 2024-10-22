-- CreateEnum
CREATE TYPE "LegalInvoiceType" AS ENUM ('loan', 'cash');

-- CreateEnum
CREATE TYPE "LegalInvoiceStatus" AS ENUM ('pending', 'paid');

-- AlterTable
ALTER TABLE "LegalInvoice" ADD COLUMN     "status" "LegalInvoiceStatus" NOT NULL DEFAULT 'paid',
ADD COLUMN     "type" "LegalInvoiceType" NOT NULL DEFAULT 'loan';

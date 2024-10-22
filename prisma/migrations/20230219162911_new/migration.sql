/*
  Warnings:

  - You are about to drop the `LegalInvoicePaymentTerm` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid');

-- DropForeignKey
ALTER TABLE "LegalInvoicePaymentTerm" DROP CONSTRAINT "LegalInvoicePaymentTerm_legalInvoiceId_fkey";

-- AlterTable
ALTER TABLE "LegalInvoice" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paidWithCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paidWithCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'pending';

-- DropTable
DROP TABLE "LegalInvoicePaymentTerm";

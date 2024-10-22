/*
  Warnings:

  - You are about to drop the column `type` on the `CreditNotePaymentForm` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `DebitNotePaymentForm` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `LegalInvoicePaymentForm` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `LegalInvoiceRemisionPaymentForm` table. All the data in the column will be lost.
  - You are about to drop the `PaymentForm` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PaymentForm" DROP CONSTRAINT "PaymentForm_organizationId_fkey";

-- AlterTable
ALTER TABLE "CreditNotePaymentForm" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "DebitNotePaymentForm" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "LegalInvoiceRemisionPaymentForm" DROP COLUMN "type";

-- DropTable
DROP TABLE "PaymentForm";

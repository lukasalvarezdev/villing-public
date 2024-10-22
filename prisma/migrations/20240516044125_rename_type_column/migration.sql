/*
  Warnings:

  - You are about to rename the column `paymentMethod` to `type` on the `CreditNotePaymentForm` table.
  - You are about to rename the column `paymentMethod` to `type` on the `DebitNotePaymentForm` table.
  - You are about to rename the column `paymentMethod` to `type` on the `LegalInvoicePaymentForm` table.
  - You are about to rename the column `paymentMethod` to `type` on the `LegalInvoiceRemisionPaymentForm` table.

*/
-- AlterTable
ALTER TABLE "CreditNotePaymentForm" RENAME COLUMN "paymentMethod" TO "type";

-- AlterTable
ALTER TABLE "DebitNotePaymentForm" RENAME COLUMN "paymentMethod" TO "type";

-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" RENAME COLUMN "paymentMethod" TO "type";

-- AlterTable
ALTER TABLE "LegalInvoiceRemisionPaymentForm" RENAME COLUMN "paymentMethod" TO "type";

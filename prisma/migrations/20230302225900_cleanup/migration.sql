/*
  Warnings:

  - You are about to drop the column `invoiceId` on the `PaymentForm` table. All the data in the column will be lost.
  - You are about to drop the `CreditPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventorySetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryTransfer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Quote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SelectionProduct` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CreditPlan" DROP CONSTRAINT "CreditPlan_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InventorySetting" DROP CONSTRAINT "InventorySetting_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransfer" DROP CONSTRAINT "InventoryTransfer_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_resolutionId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceProduct" DROP CONSTRAINT "InvoiceProduct_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceProduct" DROP CONSTRAINT "InvoiceProduct_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentForm" DROP CONSTRAINT "PaymentForm_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_subOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "SelectionProduct" DROP CONSTRAINT "SelectionProduct_inventorySettingId_fkey";

-- DropForeignKey
ALTER TABLE "SelectionProduct" DROP CONSTRAINT "SelectionProduct_inventoryTransferId_fkey";

-- DropForeignKey
ALTER TABLE "SelectionProduct" DROP CONSTRAINT "SelectionProduct_reportId_fkey";

-- AlterTable
ALTER TABLE "PaymentForm" DROP COLUMN "invoiceId";

-- DropTable
DROP TABLE "CreditPlan";

-- DropTable
DROP TABLE "InventorySetting";

-- DropTable
DROP TABLE "InventoryTransfer";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceProduct";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Quote";

-- DropTable
DROP TABLE "Report";

-- DropTable
DROP TABLE "SelectionProduct";

-- DropEnum
DROP TYPE "SettingType";

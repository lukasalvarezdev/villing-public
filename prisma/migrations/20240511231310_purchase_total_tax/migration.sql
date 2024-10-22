/*
  Warnings:

  - You are about to drop the column `totalTaxes` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `totalTaxes` on the `PurchaseInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalTaxes` on the `PurchaseRemision` table. All the data in the column will be lost.
  - Added the required column `totalTax` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTax` to the `PurchaseInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTax` to the `PurchaseRemision` table without a default value. This is not possible if the table is not empty.

*/


-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Purchase" RENAME COLUMN "totalTaxes" TO "totalTax";

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseInvoice" RENAME COLUMN "totalTaxes" TO "totalTax";

-- AlterTable
ALTER TABLE "PurchaseRemision" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseRemision" RENAME COLUMN "totalTaxes" TO "totalTax";

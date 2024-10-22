/*
  Warnings:

  - You are about to drop the column `DianConsecutive` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `internalNotes` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidWithCash` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidWithCredit` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalTaxes` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to alter the column `totalDiscount` on the `LegalInvoice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `legalInvoiceJson` column on the `LegalInvoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[dianId]` on the table `LegalInvoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dianId` to the `LegalInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `LegalInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTax` to the `LegalInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LegalInvoice" DROP COLUMN "DianConsecutive",
DROP COLUMN "expiresAt",
DROP COLUMN "internalNotes",
DROP COLUMN "paidWithCash",
DROP COLUMN "paidWithCredit",
DROP COLUMN "status",
DROP COLUMN "total",
DROP COLUMN "totalTaxes",
ADD COLUMN     "cufe" TEXT,
ADD COLUMN     "dianId" TEXT NOT NULL,
ADD COLUMN     "subtotal" INTEGER NOT NULL,
ADD COLUMN     "totalTax" INTEGER NOT NULL,
ALTER COLUMN "totalDiscount" SET DATA TYPE INTEGER,
ALTER COLUMN "internalId" DROP DEFAULT,
DROP COLUMN "legalInvoiceJson",
ADD COLUMN     "legalInvoiceJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "LegalInvoice_dianId_key" ON "LegalInvoice"("dianId");

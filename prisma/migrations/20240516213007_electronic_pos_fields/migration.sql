/*
  Warnings:

  - You are about to drop the column `pdfObjectId` on the `LegalInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidIn` on the `LegalPosInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalInVef` on the `LegalPosInvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LegalInvoice" DROP COLUMN "pdfObjectId";

-- AlterTable
ALTER TABLE "LegalPosInvoice" DROP COLUMN "paidIn",
DROP COLUMN "totalInVef",
ADD COLUMN     "cude" TEXT,
ADD COLUMN     "legalJson" JSONB,
ADD COLUMN     "numeration" INTEGER,
ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "wasEmailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zipKey" TEXT;

/*
  Warnings:

  - You are about to drop the column `invoicesCount` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `productsCount` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `quotesCount` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `salesCount` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressId` on the `Organization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_shippingAddressId_fkey";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "departmentId" INTEGER DEFAULT 2,
ADD COLUMN     "departmentName" TEXT DEFAULT 'Antioquia',
ADD COLUMN     "municipalityId" INTEGER DEFAULT 1,
ADD COLUMN     "municipalityName" TEXT DEFAULT 'Medellín';

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "invoicesCount",
DROP COLUMN "productsCount",
DROP COLUMN "quotesCount",
DROP COLUMN "salesCount",
DROP COLUMN "shippingAddressId",
ADD COLUMN     "identificationTypeId" INTEGER DEFAULT 6,
ADD COLUMN     "soenacToken" TEXT,
ADD COLUMN     "typeLiabilityId" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "typePersonId" INTEGER DEFAULT 1,
ADD COLUMN     "typeRegimeId" INTEGER DEFAULT 1;

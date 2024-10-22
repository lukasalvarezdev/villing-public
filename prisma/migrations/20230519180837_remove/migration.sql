/*
  Warnings:

  - You are about to drop the column `legalAddressId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `SubOrganization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_legalAddressId_fkey";

-- DropForeignKey
ALTER TABLE "SubOrganization" DROP CONSTRAINT "SubOrganization_addressId_fkey";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "legalAddressId";

-- AlterTable
ALTER TABLE "SubOrganization" DROP COLUMN "addressId",
ADD COLUMN     "address_" TEXT NOT NULL DEFAULT '';

/*
  Warnings:

  - You are about to drop the column `identificationTypeId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `legalName` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `retention` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `typeLiabilityId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `typePersonId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `typeRegimeId` on the `Organization` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "typeRegime" AS ENUM ('iva', 'noIva');

-- CreateEnum
CREATE TYPE "taxDetail" AS ENUM ('iva', 'inc', 'ivaAndInc', 'noTax');

-- CreateEnum
CREATE TYPE "typeLiability" AS ENUM ('noLiability', 'bigTaxPayer', 'selfRetainer', 'ivaRetentionAgent', 'simpleRegime');

-- CreateEnum
CREATE TYPE "typeOrganization" AS ENUM ('natural', 'juridical');

-- CreateEnum
CREATE TYPE "typeDocumentIdentification" AS ENUM ('cc', 'nit', 'ce', 'ps', 'te', 'die', 'pep', 'rc');

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "identificationTypeId",
DROP COLUMN "legalName",
DROP COLUMN "retention",
DROP COLUMN "typeLiabilityId",
DROP COLUMN "typePersonId",
DROP COLUMN "typeRegimeId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "ciius" TEXT[],
ADD COLUMN     "merchantRegistration" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "municipalityId" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "taxDetail" "taxDetail" NOT NULL DEFAULT 'iva',
ADD COLUMN     "tradeName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "typeDocumentIdentification" "typeDocumentIdentification" NOT NULL DEFAULT 'cc',
ADD COLUMN     "typeLiability" "typeLiability" NOT NULL DEFAULT 'noLiability',
ADD COLUMN     "typeOrganization" "typeOrganization" NOT NULL DEFAULT 'natural',
ADD COLUMN     "typeRegime" "typeRegime" NOT NULL DEFAULT 'iva';

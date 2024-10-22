/*
  Warnings:

  - You are about to drop the column `defaultForSubOrgId` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `idType` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `imageUri` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `ivaRegime` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `maxCreditAmount` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `maxPaymentDays` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `typePerson` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `idType` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `ivaRegime` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `maxCreditAmount` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `maxPaymentDays` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `typePerson` on the `Supplier` table. All the data in the column will be lost.
  - Made the column `internalId` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "defaultForSubOrgId",
DROP COLUMN "idType",
DROP COLUMN "imageUri",
DROP COLUMN "ivaRegime",
DROP COLUMN "maxCreditAmount",
DROP COLUMN "maxPaymentDays",
DROP COLUMN "paymentMethod",
DROP COLUMN "phone",
DROP COLUMN "typePerson",
ADD COLUMN     "maxCredit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxPaymentTerm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "simpleAddress" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "internalId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "idType",
DROP COLUMN "ivaRegime",
DROP COLUMN "maxCreditAmount",
DROP COLUMN "maxPaymentDays",
DROP COLUMN "phone",
DROP COLUMN "typePerson",
ADD COLUMN     "maxCredit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxPaymentTerm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "simpleAddress" TEXT NOT NULL DEFAULT '';

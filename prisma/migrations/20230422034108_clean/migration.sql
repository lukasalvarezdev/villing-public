/*
  Warnings:

  - You are about to drop the column `idType` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `ivaRegime` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `typePerson` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "idType",
DROP COLUMN "ivaRegime",
DROP COLUMN "typePerson",
ALTER COLUMN "phone" DROP NOT NULL;

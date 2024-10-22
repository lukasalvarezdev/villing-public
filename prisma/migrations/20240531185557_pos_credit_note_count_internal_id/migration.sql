/*
  Warnings:

  - Added the required column `internalId` to the `LegalCreditNote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LegalCreditNote" ADD COLUMN     "internalId" INTEGER NOT NULL;

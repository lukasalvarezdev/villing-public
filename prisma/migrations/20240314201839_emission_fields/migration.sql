/*
  Warnings:

  - Added the required column `internalId` to the `PayrollEmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "internalId" INTEGER NOT NULL,
ADD COLUMN     "zipKey" TEXT;

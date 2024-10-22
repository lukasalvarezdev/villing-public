/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `PayrollEmission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "legalJson" JSONB,
ADD COLUMN     "qr_code" TEXT,
ADD COLUMN     "uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmission_uuid_key" ON "PayrollEmission"("uuid");

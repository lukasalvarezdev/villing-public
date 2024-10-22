/*
  Warnings:

  - A unique constraint covering the columns `[zipKey]` on the table `PayrollEmission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmission_zipKey_key" ON "PayrollEmission"("zipKey");

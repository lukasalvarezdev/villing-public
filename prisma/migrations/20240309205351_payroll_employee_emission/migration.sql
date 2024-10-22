/*
  Warnings:

  - A unique constraint covering the columns `[payrollEmployeeId]` on the table `PayrollEmission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payrollEmployeeId` to the `PayrollEmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "payrollEmployeeId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmission_payrollEmployeeId_key" ON "PayrollEmission"("payrollEmployeeId");

-- AddForeignKey
ALTER TABLE "PayrollEmission" ADD CONSTRAINT "PayrollEmission_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `payrollEmissionId` on the `Accrued` table. All the data in the column will be lost.
  - You are about to drop the column `payrollEmissionId` on the `Deduction` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `PayrollEmission` table. All the data in the column will be lost.
  - You are about to drop the column `payrollId` on the `PayrollEmissionGroup` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Accrued" DROP CONSTRAINT "Accrued_payrollEmissionId_fkey";

-- DropForeignKey
ALTER TABLE "Deduction" DROP CONSTRAINT "Deduction_payrollEmissionId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEmissionGroup" DROP CONSTRAINT "PayrollEmissionGroup_payrollId_fkey";

-- AlterTable
ALTER TABLE "Accrued" DROP COLUMN "payrollEmissionId";

-- AlterTable
ALTER TABLE "Deduction" DROP COLUMN "payrollEmissionId";

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "emisionId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payrollEmissionId" TEXT;

-- AlterTable
ALTER TABLE "PayrollEmission" DROP COLUMN "salary";

-- AlterTable
ALTER TABLE "PayrollEmissionGroup" DROP COLUMN "payrollId";

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_emisionId_fkey" FOREIGN KEY ("emisionId") REFERENCES "PayrollEmissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_payrollEmissionId_fkey" FOREIGN KEY ("payrollEmissionId") REFERENCES "PayrollEmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

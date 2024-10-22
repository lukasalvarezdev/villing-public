/*
  Warnings:

  - You are about to drop the column `emisionId` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `payrollEmissionId` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `emissionGroupId` on the `PayrollEmission` table. All the data in the column will be lost.
  - You are about to drop the `PayrollEmissionGroup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `payrollId` to the `PayrollEmission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payroll" DROP CONSTRAINT "Payroll_emisionId_fkey";

-- DropForeignKey
ALTER TABLE "Payroll" DROP CONSTRAINT "Payroll_payrollEmissionId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEmission" DROP CONSTRAINT "PayrollEmission_emissionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollEmissionGroup" DROP CONSTRAINT "PayrollEmissionGroup_organizationId_fkey";

-- AlterTable
ALTER TABLE "Payroll" DROP COLUMN "emisionId",
DROP COLUMN "payrollEmissionId";

-- AlterTable
ALTER TABLE "PayrollEmission" DROP COLUMN "emissionGroupId",
ADD COLUMN     "payrollId" TEXT NOT NULL;

-- DropTable
DROP TABLE "PayrollEmissionGroup";

-- AddForeignKey
ALTER TABLE "PayrollEmission" ADD CONSTRAINT "PayrollEmission_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

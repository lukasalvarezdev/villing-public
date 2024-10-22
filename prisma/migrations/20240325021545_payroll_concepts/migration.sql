/*
  Warnings:

  - You are about to drop the `Accrued` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deduction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConceptType" AS ENUM ('income', 'deduction');

-- DropForeignKey
ALTER TABLE "Accrued" DROP CONSTRAINT "Accrued_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Accrued" DROP CONSTRAINT "Accrued_payrollEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "Accrued" DROP CONSTRAINT "Accrued_payrollTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Deduction" DROP CONSTRAINT "Deduction_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Deduction" DROP CONSTRAINT "Deduction_payrollEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "Deduction" DROP CONSTRAINT "Deduction_payrollTemplateId_fkey";

-- DropTable
DROP TABLE "Accrued";

-- DropTable
DROP TABLE "Deduction";

-- CreateTable
CREATE TABLE "PayrollConcept" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "keyName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "customPercentage" DOUBLE PRECISION,
    "type" "ConceptType" NOT NULL,
    "payrollTemplateId" TEXT,
    "payrollEmployeeId" TEXT,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "PayrollConcept_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PayrollConcept" ADD CONSTRAINT "PayrollConcept_payrollTemplateId_fkey" FOREIGN KEY ("payrollTemplateId") REFERENCES "PayrollTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConcept" ADD CONSTRAINT "PayrollConcept_payrollEmployeeId_fkey" FOREIGN KEY ("payrollEmployeeId") REFERENCES "PayrollEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConcept" ADD CONSTRAINT "PayrollConcept_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

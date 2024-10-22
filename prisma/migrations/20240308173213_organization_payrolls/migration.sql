/*
  Warnings:

  - You are about to drop the column `percent` on the `Accrued` table. All the data in the column will be lost.
  - You are about to drop the column `percent` on the `Deduction` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `Accrued` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Deduction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `PayrollEmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `PayrollEmissionGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `PayrollEmployee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `PayrollTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Accrued" DROP COLUMN "percent",
ADD COLUMN     "form" JSONB,
ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Deduction" DROP COLUMN "percent",
ADD COLUMN     "form" JSONB,
ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PayrollEmissionGroup" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PayrollEmployee" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PayrollTemplate" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Deduction" ADD CONSTRAINT "Deduction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accrued" ADD CONSTRAINT "Accrued_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollTemplate" ADD CONSTRAINT "PayrollTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmission" ADD CONSTRAINT "PayrollEmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmissionGroup" ADD CONSTRAINT "PayrollEmissionGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

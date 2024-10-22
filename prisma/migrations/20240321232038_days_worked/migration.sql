-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "daysWorked" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "daysWorked" INTEGER NOT NULL DEFAULT 30;

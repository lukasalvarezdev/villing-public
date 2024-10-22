-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('draft', 'missing_emissions', 'emitted', 'emitted_with_errors');

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "status" "PayrollStatus" NOT NULL DEFAULT 'draft';

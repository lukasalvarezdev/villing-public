-- DropForeignKey
ALTER TABLE "PayrollEmployee" DROP CONSTRAINT "PayrollEmployee_payrollId_fkey";

-- AddForeignKey
ALTER TABLE "PayrollEmployee" ADD CONSTRAINT "PayrollEmployee_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

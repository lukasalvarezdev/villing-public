/*
  Warnings:

  - You are about to drop the column `vacationDays` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Counts" ADD COLUMN     "payrollEmisionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "vacationDays";

/*
  Warnings:

  - You are about to drop the column `period` on the `Payroll` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "months" AS ENUM ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre');

-- AlterTable
ALTER TABLE "Payroll" DROP COLUMN "period",
ADD COLUMN     "month" "months" NOT NULL DEFAULT 'Enero',
ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2024;

-- AlterTable
ALTER TABLE "PayrollEmission" ADD COLUMN     "month" "months" NOT NULL DEFAULT 'Enero',
ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2024;

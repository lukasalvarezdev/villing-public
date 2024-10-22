/*
  Warnings:

  - You are about to drop the column `hasTransportationHelp` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `integralSalary` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `paymentFrequency` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `riskLevel__` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `typeContract__` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `workerSubType__` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `workerType__` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `worksOnSaturday` on the `Employee` table. All the data in the column will be lost.
  - Added the required column `city` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeContract` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeEmployee` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `idType` on the `Employee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "hasTransportationHelp",
DROP COLUMN "integralSalary",
DROP COLUMN "paymentFrequency",
DROP COLUMN "riskLevel__",
DROP COLUMN "startedAt",
DROP COLUMN "typeContract__",
DROP COLUMN "workerSubType__",
DROP COLUMN "workerType__",
DROP COLUMN "worksOnSaturday",
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "bank" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "hasPension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTransportHelp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isIntegralSalary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "surname" TEXT NOT NULL,
ADD COLUMN     "typeContract" TEXT NOT NULL,
ADD COLUMN     "typeEmployee" TEXT NOT NULL,
DROP COLUMN "idType",
ADD COLUMN     "idType" TEXT NOT NULL;

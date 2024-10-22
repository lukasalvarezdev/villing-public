/*
  Warnings:

  - You are about to drop the column `isService` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `maxStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `posSaleImage` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `preventDiscount` on the `Product` table. All the data in the column will be lost.
  - Added the required column `vacationDays` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "vacationDays" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isService",
DROP COLUMN "maxStock",
DROP COLUMN "minStock",
DROP COLUMN "posSaleImage",
DROP COLUMN "preventDiscount";

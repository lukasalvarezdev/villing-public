/*
  Warnings:

  - You are about to drop the column `address_` on the `SubOrganization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubOrganization" DROP COLUMN "address_",
ADD COLUMN     "address" TEXT NOT NULL DEFAULT '';

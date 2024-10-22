/*
  Warnings:

  - You are about to drop the column `expeditionDate` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `expirationDate` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `fromNumeration` on the `Resolution` table. All the data in the column will be lost.
  - You are about to drop the column `toNumeration` on the `Resolution` table. All the data in the column will be lost.
  - Made the column `prefix` on table `Resolution` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Resolution" DROP COLUMN "expeditionDate",
DROP COLUMN "expirationDate",
DROP COLUMN "fromNumeration",
DROP COLUMN "toNumeration",
ADD COLUMN     "enabledInDian" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "prefix" SET NOT NULL,
ALTER COLUMN "prefix" SET DEFAULT '';

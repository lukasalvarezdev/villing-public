/*
  Warnings:

  - You are about to drop the column `invoicesCount` on the `Resolution` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Resolution" DROP COLUMN "invoicesCount",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 0;

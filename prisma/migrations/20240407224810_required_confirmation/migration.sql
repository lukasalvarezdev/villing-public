/*
  Warnings:

  - Made the column `confirmedAt` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "confirmedAt" SET NOT NULL;

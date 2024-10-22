/*
  Warnings:

  - Added the required column `linkId` to the `PaymentLinks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PaymentLinks" ADD COLUMN     "linkId" TEXT NOT NULL,
ADD COLUMN     "transactionId" TEXT;

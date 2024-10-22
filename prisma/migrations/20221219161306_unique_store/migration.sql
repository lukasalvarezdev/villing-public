/*
  Warnings:

  - A unique constraint covering the columns `[organizationId]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_organizationId_key" ON "Store"("organizationId");

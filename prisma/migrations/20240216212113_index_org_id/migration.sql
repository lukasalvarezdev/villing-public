/*
  Warnings:

  - Made the column `organizationId` on table `PriceValue` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `StockValue` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PriceValue" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockValue" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PriceValue_organizationId_idx" ON "PriceValue"("organizationId");

-- CreateIndex
CREATE INDEX "StockValue_organizationId_idx" ON "StockValue"("organizationId");

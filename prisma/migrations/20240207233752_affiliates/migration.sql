/*
  Warnings:

  - A unique constraint covering the columns `[affiliateId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "affiliateId" TEXT,
ADD COLUMN     "affiliateOrganizationId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "affiliateOrganizationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_affiliateId_key" ON "Organization"("affiliateId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_affiliateOrganizationId_fkey" FOREIGN KEY ("affiliateOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

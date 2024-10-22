-- AlterTable
ALTER TABLE "PriceValue" ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "StockValue" ADD COLUMN     "organizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "PriceValue" ADD CONSTRAINT "PriceValue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockValue" ADD CONSTRAINT "StockValue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

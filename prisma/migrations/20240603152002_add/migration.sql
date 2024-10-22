-- CreateEnum
CREATE TYPE "StockSettingType" AS ENUM ('setting', 'transfer');

-- AlterTable
ALTER TABLE "InventorySetting" ADD COLUMN     "transferToId" INTEGER,
ADD COLUMN     "type" "StockSettingType" NOT NULL DEFAULT 'setting';

-- AddForeignKey
ALTER TABLE "InventorySetting" ADD CONSTRAINT "InventorySetting_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySetting" ADD CONSTRAINT "InventorySetting_transferToId_fkey" FOREIGN KEY ("transferToId") REFERENCES "SubOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

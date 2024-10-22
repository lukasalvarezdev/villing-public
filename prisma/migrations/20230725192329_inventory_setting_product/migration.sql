-- AlterTable
ALTER TABLE "InventorySettingProduct" ADD COLUMN     "productId" INTEGER;

-- AddForeignKey
ALTER TABLE "InventorySettingProduct" ADD CONSTRAINT "InventorySettingProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

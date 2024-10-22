-- CreateTable
CREATE TABLE "InventoryPriceSetting" (
    "id" SERIAL NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "priceListId" INTEGER NOT NULL,

    CONSTRAINT "InventoryPriceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPriceSettingProduct" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "productId" INTEGER,
    "inventoryPriceSettingId" INTEGER,

    CONSTRAINT "InventoryPriceSettingProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryPriceSetting" ADD CONSTRAINT "InventoryPriceSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPriceSetting" ADD CONSTRAINT "InventoryPriceSetting_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPriceSettingProduct" ADD CONSTRAINT "InventoryPriceSettingProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPriceSettingProduct" ADD CONSTRAINT "InventoryPriceSettingProduct_inventoryPriceSettingId_fkey" FOREIGN KEY ("inventoryPriceSettingId") REFERENCES "InventoryPriceSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

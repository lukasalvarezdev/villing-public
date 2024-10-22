-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('entry', 'exit');

-- CreateTable
CREATE TABLE "InventorySetting" (
    "id" SERIAL NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subOrganizationId" INTEGER NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'entry',

    CONSTRAINT "InventorySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySettingProduct" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "lastStock" INTEGER NOT NULL,
    "lastPrice" INTEGER NOT NULL,
    "inventorySettingId" INTEGER NOT NULL,

    CONSTRAINT "InventorySettingProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventorySetting" ADD CONSTRAINT "InventorySetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySettingProduct" ADD CONSTRAINT "InventorySettingProduct_inventorySettingId_fkey" FOREIGN KEY ("inventorySettingId") REFERENCES "InventorySetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

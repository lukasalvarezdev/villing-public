/*
  Warnings:

  - You are about to drop the column `lastPrice` on the `InventorySettingProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InventorySettingProduct" DROP COLUMN "lastPrice",
ADD COLUMN     "lastStockInTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "newStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "newStockInTarget" DOUBLE PRECISION NOT NULL DEFAULT 0;

/*
  Warnings:

  - You are about to drop the column `count` on the `InventoryPriceSetting` table. All the data in the column will be lost.
  - Added the required column `internalId` to the `InventoryPriceSetting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InventoryPriceSetting" DROP COLUMN "count",
ADD COLUMN     "internalId" INTEGER NOT NULL;

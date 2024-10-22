/*
  Warnings:

  - You are about to drop the column `type` on the `InventorySetting` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InventorySettingType" AS ENUM ('partial', 'total');

-- AlterTable
ALTER TABLE "InventorySetting" DROP COLUMN "type",
ADD COLUMN     "settingType" "InventorySettingType" NOT NULL DEFAULT 'partial';

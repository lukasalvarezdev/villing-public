/*
  Warnings:

  - You are about to drop the column `type` on the `SelectionProduct` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('entry', 'exit');

-- AlterTable
ALTER TABLE "InventorySetting" ADD COLUMN     "type" "SettingType" NOT NULL DEFAULT 'entry';

-- AlterTable
ALTER TABLE "SelectionProduct" DROP COLUMN "type";

-- DropEnum
DROP TYPE "InventorySettingType";

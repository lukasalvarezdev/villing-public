-- CreateEnum
CREATE TYPE "StockSettingIncomeOrExit" AS ENUM ('income', 'exit');

-- AlterTable
ALTER TABLE "InventorySetting" ADD COLUMN     "incomeOrExit" "StockSettingIncomeOrExit" NOT NULL DEFAULT 'income';

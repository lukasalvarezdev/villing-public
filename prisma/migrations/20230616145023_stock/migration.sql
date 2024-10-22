-- CreateEnum
CREATE TYPE "stocksProductsBehavior" AS ENUM ('hide', 'showAsUnavailable', 'allow');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "stocksProductsBehavior" "stocksProductsBehavior" NOT NULL DEFAULT 'allow';

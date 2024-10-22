/*
  Warnings:

  - You are about to drop the column `invalidInvoicesCount` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `invoicesCount` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `quotesCount` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `shouldHave` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `shouldHaveCard` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `shouldHaveCash` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `shouldHaveCheck` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `shouldHaveTransfer` on the `Cashier` table. All the data in the column will be lost.
  - You are about to drop the column `totalInvalidated` on the `Cashier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cashier" DROP COLUMN "invalidInvoicesCount",
DROP COLUMN "invoicesCount",
DROP COLUMN "quotesCount",
DROP COLUMN "shouldHave",
DROP COLUMN "shouldHaveCard",
DROP COLUMN "shouldHaveCash",
DROP COLUMN "shouldHaveCheck",
DROP COLUMN "shouldHaveTransfer",
DROP COLUMN "totalInvalidated",
ADD COLUMN     "incomeInCard" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incomeInCash" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incomeInCheck" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incomeInTransfers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "internalId" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invalidatedIncome" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openedById" INTEGER,
ALTER COLUMN "initialBalance" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Cashier" ADD CONSTRAINT "Cashier_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

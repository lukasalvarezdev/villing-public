-- CreateEnum
CREATE TYPE "ExpenseOrigin" AS ENUM ('bank', 'cashier');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "cashierId" INTEGER,
ADD COLUMN     "origin" "ExpenseOrigin" NOT NULL DEFAULT 'bank',
ADD COLUMN     "userId" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

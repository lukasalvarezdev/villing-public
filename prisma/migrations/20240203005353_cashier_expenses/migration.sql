-- AlterTable
ALTER TABLE "Cashier" RENAME COLUMN "totalExpenses" TO "totalBySystemExpenses";
ALTER TABLE "Cashier" ADD COLUMN "totalByUserExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0;

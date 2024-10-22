-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DebitNote" ADD COLUMN     "isTaxIncluded" BOOLEAN NOT NULL DEFAULT false;

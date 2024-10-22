-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invalidationDate" TIMESTAMP(3),
ADD COLUMN     "invalidationReason" TEXT;

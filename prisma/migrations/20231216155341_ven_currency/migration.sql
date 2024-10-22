-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('COP', 'USD', 'VEF');

-- AlterTable
ALTER TABLE "LegalPosInvoice" ADD COLUMN     "paidIn" "Currency" NOT NULL DEFAULT 'COP',
ADD COLUMN     "totalInVef" DOUBLE PRECISION NOT NULL DEFAULT 0;

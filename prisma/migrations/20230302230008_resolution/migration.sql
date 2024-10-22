-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('legalInvoice', 'posInvoice');

-- AlterTable
ALTER TABLE "Resolution" ADD COLUMN     "type" "ResolutionType" NOT NULL DEFAULT 'legalInvoice';

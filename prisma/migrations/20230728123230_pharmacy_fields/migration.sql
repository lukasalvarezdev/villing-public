-- CreateEnum
CREATE TYPE "VillingOrganizationType" AS ENUM ('normal', 'pharmacy');

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "batch" TEXT,
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "invimaRegistry" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "type" "VillingOrganizationType" NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "batch" TEXT,
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "invimaRegistry" TEXT;

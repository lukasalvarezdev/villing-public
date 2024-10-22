-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "taxDetail" "taxDetail" NOT NULL DEFAULT 'iva',
ADD COLUMN     "typeDocumentIdentification" "typeDocumentIdentification" NOT NULL DEFAULT 'nit',
ADD COLUMN     "typeLiability" "typeLiability" NOT NULL DEFAULT 'noLiability',
ADD COLUMN     "typeOrganization" "typeOrganization" NOT NULL DEFAULT 'natural',
ADD COLUMN     "typeRegime" "typeRegime" NOT NULL DEFAULT 'iva';

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "typeDocumentIdentification" SET DEFAULT 'nit';

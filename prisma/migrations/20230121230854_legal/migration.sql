-- AlterTable
ALTER TABLE "LegalInvoice" ADD COLUMN     "internalId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "legalPosInvoiceId" INTEGER;

-- CreateTable
CREATE TABLE "LegalPosInvoice" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL DEFAULT 0,
    "dianConsecutive" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subOrganizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "resolutionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "totalTaxes" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "LegalPosInvoice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPosInvoice" ADD CONSTRAINT "LegalPosInvoice_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_legalPosInvoiceId_fkey" FOREIGN KEY ("legalPosInvoiceId") REFERENCES "LegalPosInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

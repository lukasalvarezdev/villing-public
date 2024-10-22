-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "quoteInvoiceId" INTEGER;

-- CreateTable
CREATE TABLE "QuoteInvoice" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subOrganizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "totalTaxes" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "QuoteInvoice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuoteInvoice" ADD CONSTRAINT "QuoteInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInvoice" ADD CONSTRAINT "QuoteInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInvoice" ADD CONSTRAINT "QuoteInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInvoice" ADD CONSTRAINT "QuoteInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteInvoice" ADD CONSTRAINT "QuoteInvoice_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "Cashier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_quoteInvoiceId_fkey" FOREIGN KEY ("quoteInvoiceId") REFERENCES "QuoteInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LegalInvoice" (
    "id" SERIAL NOT NULL,
    "DianConsecutive" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subOrganizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "resolutionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "totalTaxes" DOUBLE PRECISION NOT NULL,
    "totalDiscount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,

    CONSTRAINT "LegalInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalInvoiceProduct" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalInvoiceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LegalInvoiceProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoice" ADD CONSTRAINT "LegalInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_legalInvoiceId_fkey" FOREIGN KEY ("legalInvoiceId") REFERENCES "LegalInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

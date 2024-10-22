-- AlterTable
ALTER TABLE "LegalInvoicePaymentForm" ADD COLUMN     "legalInvoiceRemisionId" INTEGER;

-- AlterTable
ALTER TABLE "LegalInvoiceProduct" ADD COLUMN     "legalInvoiceRemisionId" INTEGER;

-- CreateTable
CREATE TABLE "LegalInvoiceRemision" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "dianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "subOrganizationId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "totalTax" INTEGER NOT NULL,
    "totalDiscount" INTEGER NOT NULL,
    "notes" TEXT,
    "pdfObjectId" TEXT,

    CONSTRAINT "LegalInvoiceRemision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalInvoiceRemision_dianId_key" ON "LegalInvoiceRemision"("dianId");

-- AddForeignKey
ALTER TABLE "LegalInvoiceRemision" ADD CONSTRAINT "LegalInvoiceRemision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceRemision" ADD CONSTRAINT "LegalInvoiceRemision_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceRemision" ADD CONSTRAINT "LegalInvoiceRemision_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceRemision" ADD CONSTRAINT "LegalInvoiceRemision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoicePaymentForm" ADD CONSTRAINT "LegalInvoicePaymentForm_legalInvoiceRemisionId_fkey" FOREIGN KEY ("legalInvoiceRemisionId") REFERENCES "LegalInvoiceRemision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalInvoiceProduct" ADD CONSTRAINT "LegalInvoiceProduct_legalInvoiceRemisionId_fkey" FOREIGN KEY ("legalInvoiceRemisionId") REFERENCES "LegalInvoiceRemision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

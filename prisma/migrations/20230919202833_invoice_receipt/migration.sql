-- CreateTable
CREATE TABLE "InvoiceReceipt" (
    "id" SERIAL NOT NULL,
    "internalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cufe" TEXT NOT NULL,
    "invoiceJson" JSONB,
    "personWhoReceivedId" INTEGER NOT NULL,
    "personWhoReceivedTheMerchandiseId" INTEGER,

    CONSTRAINT "InvoiceReceipt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoiceReceipt" ADD CONSTRAINT "InvoiceReceipt_personWhoReceivedId_fkey" FOREIGN KEY ("personWhoReceivedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReceipt" ADD CONSTRAINT "InvoiceReceipt_personWhoReceivedTheMerchandiseId_fkey" FOREIGN KEY ("personWhoReceivedTheMerchandiseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

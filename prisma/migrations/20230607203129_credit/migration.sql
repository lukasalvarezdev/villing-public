-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "organizationId" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

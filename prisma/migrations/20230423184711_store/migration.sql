-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "subOrganizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_subOrganizationId_fkey" FOREIGN KEY ("subOrganizationId") REFERENCES "SubOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SubOrganization" ADD COLUMN     "defaultResolutionId" INTEGER;

-- AddForeignKey
ALTER TABLE "SubOrganization" ADD CONSTRAINT "SubOrganization_defaultResolutionId_fkey" FOREIGN KEY ("defaultResolutionId") REFERENCES "Resolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "hasLimitedSubOrgAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubOrganization" ADD COLUMN     "invitationId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasLimitedSubOrgAccess" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "SubOrganization" ADD CONSTRAINT "SubOrganization_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

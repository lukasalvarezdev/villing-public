-- AlterTable
ALTER TABLE "SubOrganization" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onlyAllowPOS" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "SubOrganization" ADD CONSTRAINT "SubOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

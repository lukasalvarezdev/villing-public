-- AlterTable
ALTER TABLE "SubOrganization" ADD COLUMN     "userIdCreatingTotalInventory" INTEGER;

-- AddForeignKey
ALTER TABLE "SubOrganization" ADD CONSTRAINT "SubOrganization_userIdCreatingTotalInventory_fkey" FOREIGN KEY ("userIdCreatingTotalInventory") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

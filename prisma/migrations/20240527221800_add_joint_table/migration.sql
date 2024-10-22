/*
  Warnings:

  - You are about to drop the column `userIdCreatingTotalInventory` on the `SubOrganization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubOrganization" DROP CONSTRAINT "SubOrganization_userIdCreatingTotalInventory_fkey";

-- AlterTable
ALTER TABLE "SubOrganization" DROP COLUMN "userIdCreatingTotalInventory";

-- CreateTable
CREATE TABLE "UserOrganization" (
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("userId","organizationId")
);

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

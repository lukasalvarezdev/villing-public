/*
  Warnings:

  - You are about to drop the column `userId` on the `SubOrganization` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubOrganization" DROP CONSTRAINT "SubOrganization_userId_fkey";

-- AlterTable
ALTER TABLE "SubOrganization" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "_SubOrganizationToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SubOrganizationToUser_AB_unique" ON "_SubOrganizationToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SubOrganizationToUser_B_index" ON "_SubOrganizationToUser"("B");

-- AddForeignKey
ALTER TABLE "_SubOrganizationToUser" ADD CONSTRAINT "_SubOrganizationToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "SubOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubOrganizationToUser" ADD CONSTRAINT "_SubOrganizationToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

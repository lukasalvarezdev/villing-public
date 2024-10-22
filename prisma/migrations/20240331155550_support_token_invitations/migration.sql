/*
  Warnings:

  - You are about to drop the column `hasLimitedSubOrgAccess` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `onlyAllowPOS` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AccountantOrganizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AccountantOrganizations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[token]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "AccountantOrganizations" DROP CONSTRAINT "AccountantOrganizations_accountantId_fkey";

-- DropForeignKey
ALTER TABLE "AccountantOrganizations" DROP CONSTRAINT "AccountantOrganizations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "_AccountantOrganizations" DROP CONSTRAINT "_AccountantOrganizations_A_fkey";

-- DropForeignKey
ALTER TABLE "_AccountantOrganizations" DROP CONSTRAINT "_AccountantOrganizations_B_fkey";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "hasLimitedSubOrgAccess",
DROP COLUMN "onlyAllowPOS",
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "token" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "type";

-- DropTable
DROP TABLE "AccountantOrganizations";

-- DropTable
DROP TABLE "_AccountantOrganizations";

-- DropEnum
DROP TYPE "userType";

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

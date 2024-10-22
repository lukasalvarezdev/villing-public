-- CreateEnum
CREATE TYPE "userType" AS ENUM ('accountant', 'admin', 'user');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "userType" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "AccountantOrganizations" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountantId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "AccountantOrganizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccountantOrganizations" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountantOrganizations_accountantId_organizationId_key" ON "AccountantOrganizations"("accountantId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "_AccountantOrganizations_AB_unique" ON "_AccountantOrganizations"("A", "B");

-- CreateIndex
CREATE INDEX "_AccountantOrganizations_B_index" ON "_AccountantOrganizations"("B");

-- AddForeignKey
ALTER TABLE "AccountantOrganizations" ADD CONSTRAINT "AccountantOrganizations_accountantId_fkey" FOREIGN KEY ("accountantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountantOrganizations" ADD CONSTRAINT "AccountantOrganizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountantOrganizations" ADD CONSTRAINT "_AccountantOrganizations_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccountantOrganizations" ADD CONSTRAINT "_AccountantOrganizations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

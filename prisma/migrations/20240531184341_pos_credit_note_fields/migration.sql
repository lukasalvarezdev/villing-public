/*
  Warnings:

  - Added the required column `clientId` to the `LegalCreditNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `LegalCreditNote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LegalCreditNote" ADD COLUMN     "clientId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "LegalCreditNote" ADD CONSTRAINT "LegalCreditNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCreditNote" ADD CONSTRAINT "LegalCreditNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

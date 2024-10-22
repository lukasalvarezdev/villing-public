/*
  Warnings:

  - Added the required column `resolutionId` to the `ResolutionRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ResolutionRequest" ADD COLUMN     "resolutionId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ResolutionRequest" ADD CONSTRAINT "ResolutionRequest_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "Resolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

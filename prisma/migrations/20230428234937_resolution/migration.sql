/*
  Warnings:

  - A unique constraint covering the columns `[soenacId]` on the table `Resolution` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Resolution" ADD COLUMN     "from" INTEGER DEFAULT 0,
ADD COLUMN     "fromDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "soenacId" TEXT,
ADD COLUMN     "to" INTEGER DEFAULT 0,
ADD COLUMN     "toDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fromNumeration" DROP NOT NULL,
ALTER COLUMN "toNumeration" DROP NOT NULL,
ALTER COLUMN "expeditionDate" DROP NOT NULL,
ALTER COLUMN "expirationDate" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_soenacId_key" ON "Resolution"("soenacId");

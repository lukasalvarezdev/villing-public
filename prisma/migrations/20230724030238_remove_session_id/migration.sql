/*
  Warnings:

  - You are about to drop the column `sessionId` on the `CartSession` table. All the data in the column will be lost.
  - Added the required column `price` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CartSession_sessionId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "price" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CartSession" DROP COLUMN "sessionId";

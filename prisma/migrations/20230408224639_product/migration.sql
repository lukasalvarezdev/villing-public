/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_transactionId_key" ON "Product"("transactionId");

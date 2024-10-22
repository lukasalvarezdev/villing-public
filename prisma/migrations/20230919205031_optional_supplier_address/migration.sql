-- DropForeignKey
ALTER TABLE "Supplier" DROP CONSTRAINT "Supplier_addressId_fkey";

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "addressId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

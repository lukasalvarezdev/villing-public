/*
  Warnings:

  - The `reason` column on the `LegalCreditNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PosCreditNoteCorrection" AS ENUM ('cancel', 'discount', 'price_adjustment', 'others');

-- AlterTable
ALTER TABLE "LegalCreditNote" DROP COLUMN "reason",
ADD COLUMN     "reason" "PosCreditNoteCorrection" NOT NULL DEFAULT 'cancel';

-- CreateEnum
CREATE TYPE "creditNoteCorrectionsType" AS ENUM ('return', 'cancel', 'discount', 'priceAdjustment', 'other');

-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN     "reason" "creditNoteCorrectionsType" NOT NULL DEFAULT 'return';

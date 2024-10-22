-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'update_organization';
ALTER TYPE "Permission" ADD VALUE 'create_pos_invoice';
ALTER TYPE "Permission" ADD VALUE 'cancel_pos_invoice';
ALTER TYPE "Permission" ADD VALUE 'create_credit_note';
ALTER TYPE "Permission" ADD VALUE 'create_debit_note';
ALTER TYPE "Permission" ADD VALUE 'modify_invoice_price';
ALTER TYPE "Permission" ADD VALUE 'delete_client';

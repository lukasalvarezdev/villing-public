-- DropIndex
DROP INDEX "EmailLeads_email_key";

-- AlterTable
ALTER TABLE "EmailLeads" ADD COLUMN     "phone" TEXT;

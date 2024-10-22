-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "createdAt" SET DEFAULT timezone('America/Bogota', now());

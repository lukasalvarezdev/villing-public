-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "createdAt" SET DEFAULT timezone('America/Bogota', now());

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "createdAt" SET DEFAULT timezone('America/Bogota', now());

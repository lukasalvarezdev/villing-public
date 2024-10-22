/*
  Warnings:

  - The values [pep] on the enum `typeDocumentIdentification` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "typeDocumentIdentification_new" AS ENUM ('rc', 'ti', 'cc', 'te', 'ce', 'nit', 'ps', 'die', 'nit_ext', 'nuip');
ALTER TABLE "Organization" ALTER COLUMN "typeDocumentIdentification" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "typeDocumentIdentification" TYPE "typeDocumentIdentification_new" USING ("typeDocumentIdentification"::text::"typeDocumentIdentification_new");
ALTER TYPE "typeDocumentIdentification" RENAME TO "typeDocumentIdentification_old";
ALTER TYPE "typeDocumentIdentification_new" RENAME TO "typeDocumentIdentification";
DROP TYPE "typeDocumentIdentification_old";
ALTER TABLE "Organization" ALTER COLUMN "typeDocumentIdentification" SET DEFAULT 'cc';
COMMIT;

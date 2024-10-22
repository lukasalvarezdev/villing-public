-- CreateEnum
CREATE TYPE "Country" AS ENUM ('col', 'ven');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "country" "Country" NOT NULL DEFAULT 'col';

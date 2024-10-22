-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('active', 'pending');

-- AlterTable
ALTER TABLE "Resolution" ADD COLUMN     "status" "ResolutionStatus" NOT NULL DEFAULT 'active';

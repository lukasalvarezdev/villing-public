-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('user', 'accountant');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "hasCompletedClientStep" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasCompletedProductStep" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasCompletedResolutionStep" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasCompletedSettingsStep" BOOLEAN NOT NULL DEFAULT true;

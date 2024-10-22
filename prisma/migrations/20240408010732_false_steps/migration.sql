-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "hasCompletedClientStep" SET DEFAULT false,
ALTER COLUMN "hasCompletedProductStep" SET DEFAULT false,
ALTER COLUMN "hasCompletedResolutionStep" SET DEFAULT false,
ALTER COLUMN "hasCompletedSettingsStep" SET DEFAULT false;

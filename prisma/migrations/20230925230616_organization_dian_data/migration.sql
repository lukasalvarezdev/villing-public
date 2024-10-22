-- CreateTable
CREATE TABLE "OrganizationDianData" (
    "id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "soenacToken" TEXT,
    "certificateInBase64" TEXT,
    "certificatePassword" TEXT,

    CONSTRAINT "OrganizationDianData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrganizationDianData" ADD CONSTRAINT "OrganizationDianData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

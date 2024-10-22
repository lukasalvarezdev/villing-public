-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "currentPaymentLinkUrl" TEXT;

-- AlterTable
ALTER TABLE "PaymentPlan" ADD COLUMN     "paymentLinkId" TEXT;

-- CreateTable
CREATE TABLE "PaymentLinks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "link" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "PaymentLinks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLinks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLinks" ADD CONSTRAINT "PaymentLinks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

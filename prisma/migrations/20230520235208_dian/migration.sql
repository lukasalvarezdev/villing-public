-- CreateTable
CREATE TABLE "DianErrorLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "DianErrorLog_pkey" PRIMARY KEY ("id")
);

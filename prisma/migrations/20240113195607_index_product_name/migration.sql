-- DropIndex
DROP INDEX "Product_organizationId_idx";

-- CreateIndex
CREATE INDEX "Product_organizationId_name_idx" ON "Product"("organizationId", "name");

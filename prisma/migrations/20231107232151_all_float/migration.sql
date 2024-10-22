-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Cashier" ALTER COLUMN "initialBalance" SET DEFAULT 0,
ALTER COLUMN "initialBalance" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "finalBalance" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalTax" SET DEFAULT 0,
ALTER COLUMN "totalTax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "incomeInCard" SET DEFAULT 0,
ALTER COLUMN "incomeInCard" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "incomeInCash" SET DEFAULT 0,
ALTER COLUMN "incomeInCash" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "incomeInCheck" SET DEFAULT 0,
ALTER COLUMN "incomeInCheck" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "incomeInTransfers" SET DEFAULT 0,
ALTER COLUMN "incomeInTransfers" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "invalidatedIncome" SET DEFAULT 0,
ALTER COLUMN "invalidatedIncome" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "invalidatedSales" SET DEFAULT 0,
ALTER COLUMN "invalidatedSales" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "expenses" SET DEFAULT 0,
ALTER COLUMN "expenses" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "retention" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxCredit" SET DEFAULT 0,
ALTER COLUMN "maxCredit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CreditNote" ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalTax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalDiscount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DebitNote" ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalTax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalDiscount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventoryPriceSettingProduct" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "oldPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventorySettingProduct" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "lastStock" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "lastPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "cost" SET DEFAULT 0,
ALTER COLUMN "cost" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LegalInvoice" ALTER COLUMN "totalDiscount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalTax" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "LegalInvoiceRemision" ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalTax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalDiscount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "totalAmount" SET DEFAULT 0,
ALTER COLUMN "totalAmount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderProduct" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "cost" SET DEFAULT 0,
ALTER COLUMN "cost" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PaymentForm" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PaymentPlan" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PriceValue" ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "retention" SET DEFAULT 0,
ALTER COLUMN "retention" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PurchasePayment" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PurchaseRemision" ALTER COLUMN "retention" SET DEFAULT 0,
ALTER COLUMN "retention" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StockValue" ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SubOrganization" ALTER COLUMN "initialBalance" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "retention" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxCredit" SET DEFAULT 0,
ALTER COLUMN "maxCredit" SET DATA TYPE DOUBLE PRECISION;

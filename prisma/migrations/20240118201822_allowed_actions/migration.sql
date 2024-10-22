/*
  Warnings:

  - You are about to drop the column `permissions` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `Roles` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AllowedAction" AS ENUM ('see_stats', 'see_invoices', 'create_eletronic_invoice', 'create_pos_and_remision', 'cancel_pos_and_remision', 'see_purchases', 'create_purchase', 'cancel_purchase', 'update_organization', 'update_members', 'delete_member', 'update_clients', 'update_suppliers', 'update_expenses', 'update_products', 'remove_product', 'update_price_in_invoice', 'update_price_list_in_invoice', 'see_stock_settings', 'create_stock_settings');

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "permissions";

-- AlterTable
ALTER TABLE "Roles" DROP COLUMN "permissions",
ADD COLUMN     "allowedActions" "AllowedAction"[];

-- AlterTable
ALTER TABLE "User" DROP COLUMN "permissions",
ADD COLUMN     "allowedActions" "AllowedAction"[];

-- DropEnum
DROP TYPE "Permission";

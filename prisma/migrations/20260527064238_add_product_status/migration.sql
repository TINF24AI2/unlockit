-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'DELETED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

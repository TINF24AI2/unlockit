-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('SINGLE', 'VOLUME');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "vendor" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_keys" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "licenseName" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL DEFAULT 'SINGLE',
    "maxUsages" INTEGER NOT NULL DEFAULT 1,
    "currentUsages" INTEGER NOT NULL DEFAULT 0,
    "requiresAdminApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_assignments" (
    "id" TEXT NOT NULL,
    "licenseKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "assignmentNote" TEXT,

    CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_createdById_idx" ON "products"("createdById");

-- CreateIndex
CREATE INDEX "license_keys_productId_idx" ON "license_keys"("productId");

-- CreateIndex
CREATE INDEX "license_keys_uploadedById_idx" ON "license_keys"("uploadedById");

-- CreateIndex
CREATE INDEX "license_assignments_licenseKeyId_idx" ON "license_assignments"("licenseKeyId");

-- CreateIndex
CREATE INDEX "license_assignments_userId_idx" ON "license_assignments"("userId");

-- CreateIndex
CREATE INDEX "license_assignments_processedById_idx" ON "license_assignments"("processedById");

-- AddForeignKey
ALTER TABLE "license_keys" ADD CONSTRAINT "license_keys_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_assignments" ADD CONSTRAINT "license_assignments_licenseKeyId_fkey" FOREIGN KEY ("licenseKeyId") REFERENCES "license_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

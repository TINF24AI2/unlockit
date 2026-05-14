-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" TEXT NOT NULL,
    "licenseAssignmentId" TEXT NOT NULL,
    "oldStatus" "AssignmentStatus" NOT NULL,
    "newStatus" "AssignmentStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" INTEGER NOT NULL,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentHistory_licenseAssignmentId_idx" ON "AssignmentHistory"("licenseAssignmentId");

-- CreateIndex
CREATE INDEX "AssignmentHistory_changedById_idx" ON "AssignmentHistory"("changedById");

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_licenseAssignmentId_fkey" FOREIGN KEY ("licenseAssignmentId") REFERENCES "license_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Move every processed assignment info into the history table
INSERT INTO "AssignmentHistory" ("id", "licenseAssignmentId", "oldStatus", "newStatus", "changedAt", "changedById")
SELECT
  gen_random_uuid() as "id",
  "id" as "licenseAssignmentId",
  CASE
      WHEN "status" = 'APPROVED' THEN 'PENDING'
      WHEN "status" = 'REJECTED' THEN 'PENDING'
      WHEN "status" = 'REVOKED' THEN 'APPROVED'
      ELSE "status"
  END AS "oldStatus",
  "status" AS "newStatus",
  "processedAt" AS "changedAt",
  "processedById" AS "changedById"
FROM "license_assignments"
WHERE "processedAt" IS NOT NULL AND "processedById" IS NOT NULL AND "status" != 'PENDING';

-- DropForeignKey
ALTER TABLE "license_assignments" DROP CONSTRAINT "license_assignments_processedById_fkey";

-- DropIndex
DROP INDEX "license_assignments_processedById_idx";

-- AlterTable
ALTER TABLE "license_assignments" DROP COLUMN "processedAt",
DROP COLUMN "processedById";

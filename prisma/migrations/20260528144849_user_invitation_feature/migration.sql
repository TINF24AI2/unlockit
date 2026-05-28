/*
  Warnings:

  - You are about to drop the column `needsPasswordReset` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'INVITED';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "needsPasswordReset",
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'INVITED';

-- CreateTable
CREATE TABLE "PasswordTokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordTokens_token_key" ON "PasswordTokens"("token");

-- CreateIndex
CREATE INDEX "PasswordTokens_userId_idx" ON "PasswordTokens"("userId");

-- AddForeignKey
ALTER TABLE "PasswordTokens" ADD CONSTRAINT "PasswordTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

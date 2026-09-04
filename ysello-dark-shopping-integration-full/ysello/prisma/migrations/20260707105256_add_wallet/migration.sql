-- AlterTable
ALTER TABLE "EmailVerificationToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RefreshSession" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SellerApplication" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balanceCents" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WalletDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CARD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletDeposit_userId_createdAt_idx" ON "WalletDeposit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletDeposit_status_idx" ON "WalletDeposit"("status");

-- AddForeignKey
ALTER TABLE "WalletDeposit" ADD CONSTRAINT "WalletDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

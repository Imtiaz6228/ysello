ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'AWAITING_BUYER';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'AWAITING_SELLER';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_BUYER';
ALTER TYPE "DisputeStatus" ADD VALUE IF NOT EXISTS 'RESOLVED_SELLER';

ALTER TABLE "Dispute"
  ADD COLUMN IF NOT EXISTS "orderItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "refundDemanded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "awaitingParty" TEXT,
  ADD COLUMN IF NOT EXISTS "autoCloseAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedInFavorOf" TEXT,
  ADD COLUMN IF NOT EXISTS "lastBuyerMessageAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSellerMessageAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAdminMessageAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Dispute_orderItemId_idx" ON "Dispute"("orderItemId");
CREATE INDEX IF NOT EXISTS "Dispute_autoCloseAt_idx" ON "Dispute"("autoCloseAt");

ALTER TABLE "OrderMessage"
  ADD COLUMN IF NOT EXISTS "attachmentName" TEXT,
  ADD COLUMN IF NOT EXISTS "attachmentMimeType" TEXT;

CREATE TABLE IF NOT EXISTS "SellerEarning" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "grossCents" INTEGER NOT NULL,
  "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
  "netCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'FROZEN',
  "availableAt" TIMESTAMP(3) NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerEarning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerEarning_orderItemId_key" ON "SellerEarning"("orderItemId");
CREATE INDEX IF NOT EXISTS "SellerEarning_sellerId_status_idx" ON "SellerEarning"("sellerId", "status");
CREATE INDEX IF NOT EXISTS "SellerEarning_availableAt_status_idx" ON "SellerEarning"("availableAt", "status");
DO $$ BEGIN
  ALTER TABLE "SellerEarning" ADD CONSTRAINT "SellerEarning_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SellerEarning" ADD CONSTRAINT "SellerEarning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WithdrawalRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "blockchain" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT,
  "adminNotes" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WithdrawalRequest_userId_createdAt_idx" ON "WithdrawalRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");
DO $$ BEGIN
  ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

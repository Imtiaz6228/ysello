-- Add the buyer crypto top-up workflow and auditable wallet ledger.
-- These models already exist in schema.prisma; this migration makes them
-- available in deployed databases so create/proof/approve can complete.

DO $$ BEGIN
  CREATE TYPE "TopupMethod" AS ENUM (
    'CRYPTO_TRC20', 'CRYPTO_ERC20', 'CRYPTO_BEP20',
    'BTC', 'ETH', 'SOL', 'BANK', 'PAYPAL', 'STRIPE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TopupStatus" AS ENUM (
    'PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WalletTxType" AS ENUM (
    'TOPUP', 'PURCHASE', 'COMMISSION_SALE', 'COMMISSION_WITHDRAW',
    'SELLER_PAYOUT', 'WITHDRAWAL', 'REFUND', 'FROZEN_RELEASE', 'ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TopupRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "method" "TopupMethod" NOT NULL,
  "status" "TopupStatus" NOT NULL DEFAULT 'PENDING',
  "depositAddress" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "txHash" TEXT,
  "screenshotPath" TEXT,
  "screenshotUrl" TEXT,
  "networkVerified" BOOLEAN NOT NULL DEFAULT false,
  "adminNotes" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TopupRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTxType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "orderId" TEXT,
  "relatedId" TEXT,
  "balanceAfter" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- Public marketplace media is also kept in PostgreSQL. The filesystem remains
-- a fast cache, while this copy survives stateless Railway deployments.
CREATE TABLE IF NOT EXISTS "PublicUpload" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TopupRequest_reference_key" ON "TopupRequest"("reference");
CREATE INDEX IF NOT EXISTS "TopupRequest_userId_createdAt_idx" ON "TopupRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TopupRequest_status_createdAt_idx" ON "TopupRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "TopupRequest_reference_idx" ON "TopupRequest"("reference");
CREATE INDEX IF NOT EXISTS "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PublicUpload_fileName_key" ON "PublicUpload"("fileName");
CREATE INDEX IF NOT EXISTS "PublicUpload_createdAt_idx" ON "PublicUpload"("createdAt");

DO $$ BEGIN
  ALTER TABLE "TopupRequest" ADD CONSTRAINT "TopupRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

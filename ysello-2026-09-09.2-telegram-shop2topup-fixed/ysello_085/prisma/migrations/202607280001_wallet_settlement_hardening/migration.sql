-- Separate buyer deposits from seller proceeds, make payment proofs replay-safe,
-- and retain the reviewer responsible for every withdrawal decision.

DO $$ BEGIN
  CREATE TYPE "WalletBalanceKind" AS ENUM ('BUYER', 'SELLER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "sellerBalanceCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TopupRequest"
  ADD COLUMN IF NOT EXISTS "proofSubmittedAt" TIMESTAMP(3);

ALTER TABLE "WithdrawalRequest"
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

ALTER TABLE "WalletTransaction"
  ADD COLUMN IF NOT EXISTS "balanceKind" "WalletBalanceKind" NOT NULL DEFAULT 'BUYER';

-- Existing proof submissions predate the explicit proof timestamp.
UPDATE "TopupRequest"
SET "proofSubmittedAt" = COALESCE("updatedAt", "createdAt")
WHERE "txHash" IS NOT NULL
  AND BTRIM("txHash") <> ''
  AND "proofSubmittedAt" IS NULL;

-- Quarantine repeated historical transaction IDs before enforcing uniqueness.
-- The first request remains reviewable; later duplicates retain their audit row
-- and screenshot but must be resubmitted with a unique on-chain transaction.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(BTRIM("txHash"))
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS duplicate_rank
  FROM "TopupRequest"
  WHERE "txHash" IS NOT NULL AND BTRIM("txHash") <> ''
)
UPDATE "TopupRequest" AS request
SET
  "txHash" = NULL,
  "networkVerified" = false,
  "proofSubmittedAt" = NULL,
  "adminNotes" = CONCAT(
    '[Migration review required: duplicate TXID was quarantined.] ',
    COALESCE(request."adminNotes", '')
  )
FROM ranked
WHERE request."id" = ranked."id"
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "TopupRequest_txHash_key"
  ON "TopupRequest"("txHash");

-- Earlier releases credited matured seller earnings into the same balance used
-- for buyer top-ups. Move only the identifiable, still-held seller portion.
WITH available_earnings AS (
  SELECT "sellerId", COALESCE(SUM("netCents"), 0)::INTEGER AS cents
  FROM "SellerEarning"
  WHERE "status" = 'AVAILABLE'
  GROUP BY "sellerId"
),
reserved_withdrawals AS (
  SELECT "userId", COALESCE(SUM("amountCents"), 0)::INTEGER AS cents
  FROM "WithdrawalRequest"
  WHERE "status" IN ('PENDING', 'APPROVED')
  GROUP BY "userId"
),
transferable AS (
  SELECT
    account."id",
    LEAST(
      account."balanceCents",
      GREATEST(
        COALESCE(earnings.cents, 0) - COALESCE(withdrawals.cents, 0),
        0
      )
    )::INTEGER AS cents
  FROM "User" AS account
  LEFT JOIN available_earnings AS earnings
    ON earnings."sellerId" = account."id"
  LEFT JOIN reserved_withdrawals AS withdrawals
    ON withdrawals."userId" = account."id"
  WHERE account."sellerBalanceCents" = 0
)
UPDATE "User" AS account
SET
  "sellerBalanceCents" = transferable.cents,
  "balanceCents" = account."balanceCents" - transferable.cents
FROM transferable
WHERE account."id" = transferable."id"
  AND transferable.cents > 0;

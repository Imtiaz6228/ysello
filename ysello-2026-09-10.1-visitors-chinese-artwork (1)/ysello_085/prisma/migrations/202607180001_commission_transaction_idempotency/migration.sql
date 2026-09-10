-- Keep marketplace commission records idempotent when a payment callback is retried.
--
-- Some production databases were created from the committed migration history,
-- which did not yet contain AdminTransaction. Keep this migration restart-safe so
-- Prisma can re-run it after a failed deployment has been marked as rolled back.
BEGIN;

DO $$ BEGIN
  CREATE TYPE "CommissionType" AS ENUM ('COMMISSION_SALE', 'COMMISSION_WITHDRAW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminTransaction" (
  "id" TEXT NOT NULL,
  "type" "CommissionType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "orderId" TEXT,
  "withdrawalId" TEXT,
  "walletId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminTransaction_type_createdAt_idx"
  ON "AdminTransaction"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminTransaction_createdAt_idx"
  ON "AdminTransaction"("createdAt");

-- Preserve any historical duplicate rows before removing them from the live
-- commission ledger. The oldest row stays canonical and every removed row
-- remains available for audit in this archive table.
CREATE TABLE IF NOT EXISTS "AdminTransactionDuplicateArchive" (
  "id" TEXT NOT NULL,
  "type" "CommissionType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "orderId" TEXT,
  "withdrawalId" TEXT,
  "walletId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archiveReason" TEXT NOT NULL,
  CONSTRAINT "AdminTransactionDuplicateArchive_pkey" PRIMARY KEY ("id")
);

WITH ranked AS (
  SELECT
    transaction.*,
    ROW_NUMBER() OVER (
      PARTITION BY transaction."type", transaction."reference"
      ORDER BY transaction."createdAt", transaction."id"
    ) AS duplicate_rank
  FROM "AdminTransaction" AS transaction
  WHERE transaction."reference" IS NOT NULL
)
INSERT INTO "AdminTransactionDuplicateArchive" (
  "id", "type", "amountCents", "description", "reference", "orderId",
  "withdrawalId", "walletId", "createdAt", "archiveReason"
)
SELECT
  ranked."id", ranked."type", ranked."amountCents", ranked."description",
  ranked."reference", ranked."orderId", ranked."withdrawalId",
  ranked."walletId", ranked."createdAt", 'duplicate type/reference before idempotency constraint'
FROM ranked
WHERE ranked.duplicate_rank > 1
ON CONFLICT ("id") DO NOTHING;

WITH duplicate_ids AS (
  SELECT "id"
  FROM (
    SELECT
      transaction."id",
      ROW_NUMBER() OVER (
        PARTITION BY transaction."type", transaction."reference"
        ORDER BY transaction."createdAt", transaction."id"
      ) AS duplicate_rank
    FROM "AdminTransaction" AS transaction
    WHERE transaction."reference" IS NOT NULL
  ) AS ranked
  WHERE ranked.duplicate_rank > 1
)
DELETE FROM "AdminTransaction"
WHERE "id" IN (SELECT "id" FROM duplicate_ids);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminTransaction_type_reference_key"
  ON "AdminTransaction"("type", "reference");

COMMIT;

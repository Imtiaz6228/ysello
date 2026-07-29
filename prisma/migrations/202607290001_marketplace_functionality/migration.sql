-- Mark products published by administrators as official marketplace listings.
ALTER TABLE "Product"
ADD COLUMN "isOfficial" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product" AS product
SET "isOfficial" = true
FROM "User" AS account
WHERE product."sellerId" = account."id"
  AND account."role" IN ('ADMIN', 'SUPER_ADMIN');

CREATE INDEX "Product_isOfficial_status_idx"
ON "Product"("isOfficial", "status");

-- Preserve the buyer's quoted network-fee estimate with every top-up request.
ALTER TABLE "TopupRequest"
ADD COLUMN "networkFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totalPayableCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "TopupRequest"
SET "totalPayableCents" = "amountCents"
WHERE "totalPayableCents" = 0;

-- Allow anonymous visitors to start a secure admin-support conversation.
ALTER TABLE "ChatSession"
ALTER COLUMN "userId" DROP NOT NULL,
ADD COLUMN "guestName" TEXT,
ADD COLUMN "guestEmail" TEXT,
ADD COLUMN "guestTokenHash" TEXT;

CREATE UNIQUE INDEX "ChatSession_guestTokenHash_key"
ON "ChatSession"("guestTokenHash");

CREATE INDEX "ChatSession_guestEmail_updatedAt_idx"
ON "ChatSession"("guestEmail", "updatedAt");

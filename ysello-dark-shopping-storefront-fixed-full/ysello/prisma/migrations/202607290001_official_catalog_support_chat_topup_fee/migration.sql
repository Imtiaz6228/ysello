ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "isOfficial" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product" AS product
SET "isOfficial" = true
FROM "SellerProfile" AS seller
WHERE product."sellerId" = seller."userId"
  AND seller."storeName" = 'Ysello Official';

ALTER TABLE "TopupRequest"
ADD COLUMN IF NOT EXISTS "networkFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalPayableCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "TopupRequest"
SET "totalPayableCents" = "amountCents" + "networkFeeCents"
WHERE "totalPayableCents" = 0;

ALTER TABLE "ChatSession"
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ChatSession"
ADD COLUMN IF NOT EXISTS "visitorTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "guestName" TEXT,
ADD COLUMN IF NOT EXISTS "guestEmail" TEXT,
ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "ChatSession_visitorTokenHash_key"
ON "ChatSession"("visitorTokenHash");

CREATE INDEX IF NOT EXISTS "ChatSession_lastMessageAt_idx"
ON "ChatSession"("lastMessageAt");

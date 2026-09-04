-- Keep paid digital deliveries and private top-up evidence available across
-- Railway container restarts. Existing disk-backed rows remain valid and use
-- their original storagePath fallback until the seller uploads a new version.

ALTER TABLE "ProductFile"
  ADD COLUMN IF NOT EXISTS "data" BYTEA;

ALTER TABLE "TopupRequest"
  ADD COLUMN IF NOT EXISTS "screenshotData" BYTEA,
  ADD COLUMN IF NOT EXISTS "screenshotMimeType" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryMessage" TEXT;

-- Existing paid download orders were already fulfilled through a download
-- grant or allocated inventory. Backfill their per-item delivery state so
-- mixed orders can transition cleanly when the seller completes a service.
UPDATE "OrderItem" AS item
SET
  "deliveredAt" = orders."paidAt",
  "deliveryMessage" = 'Delivered automatically after payment confirmation.'
FROM "Order" AS orders, "Product" AS product
WHERE item."orderId" = orders."id"
  AND item."productId" = product."id"
  AND product."type" = 'DOWNLOAD'
  AND orders."paidAt" IS NOT NULL
  AND item."deliveredAt" IS NULL;

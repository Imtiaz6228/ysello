CREATE TABLE "DarkShoppingListing" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "remoteProductId" INTEGER NOT NULL,
  "remoteCategoryId" INTEGER NOT NULL,
  "remoteGroupId" INTEGER,
  "supplierPriceRubCents" INTEGER NOT NULL,
  "marginPercent" INTEGER NOT NULL DEFAULT 15,
  "remoteQuantity" INTEGER NOT NULL DEFAULT 0,
  "remoteMinimumOrder" INTEGER NOT NULL DEFAULT 1,
  "isManualDelivery" BOOLEAN NOT NULL DEFAULT false,
  "remoteUrl" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DarkShoppingListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DarkShoppingFulfillment" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "idempotenceId" TEXT NOT NULL,
  "remoteOrderId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "supplierUnitPriceRubCents" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "deliveryUrl" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lastCheckedAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DarkShoppingFulfillment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DarkShoppingListing_productId_key"
ON "DarkShoppingListing"("productId");
CREATE UNIQUE INDEX "DarkShoppingListing_remoteProductId_key"
ON "DarkShoppingListing"("remoteProductId");
CREATE INDEX "DarkShoppingListing_isEnabled_lastSyncedAt_idx"
ON "DarkShoppingListing"("isEnabled", "lastSyncedAt");
CREATE INDEX "DarkShoppingListing_remoteCategoryId_remoteGroupId_idx"
ON "DarkShoppingListing"("remoteCategoryId", "remoteGroupId");

CREATE UNIQUE INDEX "DarkShoppingFulfillment_orderItemId_key"
ON "DarkShoppingFulfillment"("orderItemId");
CREATE UNIQUE INDEX "DarkShoppingFulfillment_idempotenceId_key"
ON "DarkShoppingFulfillment"("idempotenceId");
CREATE UNIQUE INDEX "DarkShoppingFulfillment_remoteOrderId_key"
ON "DarkShoppingFulfillment"("remoteOrderId");
CREATE INDEX "DarkShoppingFulfillment_status_lastCheckedAt_idx"
ON "DarkShoppingFulfillment"("status", "lastCheckedAt");
CREATE INDEX "DarkShoppingFulfillment_listingId_createdAt_idx"
ON "DarkShoppingFulfillment"("listingId", "createdAt");

ALTER TABLE "DarkShoppingListing"
ADD CONSTRAINT "DarkShoppingListing_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DarkShoppingFulfillment"
ADD CONSTRAINT "DarkShoppingFulfillment_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "DarkShoppingListing"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DarkShoppingFulfillment"
ADD CONSTRAINT "DarkShoppingFulfillment_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
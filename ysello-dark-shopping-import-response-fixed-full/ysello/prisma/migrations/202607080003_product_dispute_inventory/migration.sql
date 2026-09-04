ALTER TABLE "Product"
  ADD COLUMN "priceUsdCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priceCnyCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priceRubCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "afterSalesServiceHours" INTEGER NOT NULL DEFAULT 12;

UPDATE "Product" SET "priceUsdCents" = "priceCents" WHERE "priceUsdCents" = 0;

CREATE TABLE "ProductInventoryItem" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "content" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductInventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductInventoryItem_productId_isActive_deliveredAt_idx" ON "ProductInventoryItem"("productId", "isActive", "deliveredAt");
CREATE INDEX "ProductInventoryItem_orderItemId_idx" ON "ProductInventoryItem"("orderItemId");

ALTER TABLE "ProductInventoryItem" ADD CONSTRAINT "ProductInventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductInventoryItem" ADD CONSTRAINT "ProductInventoryItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

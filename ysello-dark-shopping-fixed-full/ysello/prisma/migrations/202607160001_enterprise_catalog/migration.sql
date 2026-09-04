ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "ProductStatus" ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';

ALTER TABLE "Category"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "bannerUrl" TEXT,
  ADD COLUMN "metaKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isTrending" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
  ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "videoUrl" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "platform" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "server" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "deliveryMethod" TEXT,
  ADD COLUMN "productKind" TEXT,
  ADD COLUMN "condition" TEXT,
  ADD COLUMN "stockType" TEXT,
  ADD COLUMN "duration" TEXT,
  ADD COLUMN "warranty" TEXT,
  ADD COLUMN "refundPolicy" TEXT,
  ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "minimumOrder" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maximumOrder" INTEGER,
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "salePriceCents" INTEGER,
  ADD COLUMN "wholesalePriceCents" INTEGER,
  ADD COLUMN "discountPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "couponSupport" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isRecommended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "instantDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualDelivery" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "digitalDownload" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "productAttributes" JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX "Category_isFeatured_isTrending_idx" ON "Category"("isFeatured", "isTrending");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

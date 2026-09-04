-- Lock all Dark.shopping resale listings to the marketplace-wide 30% markup.
ALTER TABLE "DarkShoppingListing" ALTER COLUMN "marginPercent" SET DEFAULT 30;
UPDATE "DarkShoppingListing" SET "marginPercent" = 30 WHERE "marginPercent" <> 30;

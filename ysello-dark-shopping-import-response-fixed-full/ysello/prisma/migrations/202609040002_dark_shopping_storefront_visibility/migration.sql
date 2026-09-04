-- Dark.shopping products selected by an admin for import should be visible on
-- the public storefront by default. Preserve intentionally paused HIDDEN
-- products while promoting only legacy DRAFT supplier imports.
WITH promoted AS (
  UPDATE "Product"
  SET
    "status" = 'APPROVED',
    "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "status" = 'DRAFT'
    AND "id" IN (SELECT "productId" FROM "DarkShoppingListing")
  RETURNING "id"
)
UPDATE "DarkShoppingListing"
SET
  "isEnabled" = TRUE,
  "lastError" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "productId" IN (SELECT "id" FROM promoted);

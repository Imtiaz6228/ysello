ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "officialStoreName" TEXT;

UPDATE "Product"
SET "officialStoreName" = 'Ysello Official'
WHERE "isOfficial" = true
  AND ("officialStoreName" IS NULL OR "officialStoreName" = '');

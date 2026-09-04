CREATE TYPE "SellerDocumentType" AS ENUM ('ID_CARD', 'PASSPORT');

ALTER TABLE "SellerApplication"
  ADD COLUMN "documentName" TEXT,
  ADD COLUMN "documentType" "SellerDocumentType",
  ADD COLUMN "documentFrontPath" TEXT,
  ADD COLUMN "documentFrontOriginalName" TEXT,
  ADD COLUMN "documentFrontMimeType" TEXT,
  ADD COLUMN "documentBackPath" TEXT,
  ADD COLUMN "documentBackOriginalName" TEXT,
  ADD COLUMN "documentBackMimeType" TEXT;

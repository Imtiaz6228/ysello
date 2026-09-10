ALTER TABLE "User"
  ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "ExternalAuthAccount" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExternalAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalAuthAccount_provider_providerAccountId_key"
  ON "ExternalAuthAccount"("provider", "providerAccountId");

CREATE UNIQUE INDEX "ExternalAuthAccount_userId_provider_key"
  ON "ExternalAuthAccount"("userId", "provider");

CREATE INDEX "ExternalAuthAccount_userId_idx"
  ON "ExternalAuthAccount"("userId");

ALTER TABLE "ExternalAuthAccount"
  ADD CONSTRAINT "ExternalAuthAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
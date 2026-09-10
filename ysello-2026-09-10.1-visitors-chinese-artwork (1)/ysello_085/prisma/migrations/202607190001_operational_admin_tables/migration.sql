-- Add operational tables that already exist in schema.prisma but were missing
-- from the committed production migration history.
BEGIN;

DO $$ BEGIN
  CREATE TYPE "KbArticleStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LiveSessionStatus" AS ENUM ('ACTIVE', 'TAKEN_OVER', 'RELEASED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "KbArticle" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "tags" TEXT[],
  "status" "KbArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KbArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "LiveSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentUrl" TEXT,
  "country" TEXT,
  "city" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "isTyping" BOOLEAN NOT NULL DEFAULT false,
  "screenSharing" BOOLEAN NOT NULL DEFAULT false,
  "takenOverBy" TEXT,
  "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveSessionEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveSessionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AI',
  "subject" TEXT,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "authorId" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminWallet" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "blockchain" TEXT NOT NULL DEFAULT 'TRC20',
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "totalReceivedCents" INTEGER NOT NULL DEFAULT 0,
  "totalSentCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KbArticle_slug_key" ON "KbArticle"("slug");
CREATE INDEX IF NOT EXISTS "KbArticle_status_category_idx" ON "KbArticle"("status", "category");
CREATE INDEX IF NOT EXISTS "KbArticle_slug_idx" ON "KbArticle"("slug");
CREATE INDEX IF NOT EXISTS "LiveSession_status_lastActivity_idx" ON "LiveSession"("status", "lastActivity");
CREATE INDEX IF NOT EXISTS "LiveSession_userId_idx" ON "LiveSession"("userId");
CREATE INDEX IF NOT EXISTS "LiveSessionEvent_sessionId_createdAt_idx" ON "LiveSessionEvent"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatSession_userId_createdAt_idx" ON "ChatSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatSession_status_idx" ON "ChatSession"("status");
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminWallet_label_key" ON "AdminWallet"("label");

DO $$ BEGIN
  ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LiveSessionEvent" ADD CONSTRAINT "LiveSessionEvent_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

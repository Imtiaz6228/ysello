ALTER TABLE "ChatSession"
ADD COLUMN "recipientId" TEXT,
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'SUPPORT',
ADD COLUMN "contextLabel" TEXT,
ADD COLUMN "contextUrl" TEXT;

ALTER TABLE "ChatSession"
ADD CONSTRAINT "ChatSession_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ChatSession_recipientId_kind_lastMessageAt_idx"
ON "ChatSession"("recipientId", "kind", "lastMessageAt");

CREATE INDEX "ChatSession_kind_status_idx"
ON "ChatSession"("kind", "status");
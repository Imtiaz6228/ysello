CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REMOVED');
CREATE TYPE "ProductType" AS ENUM ('DOWNLOAD', 'SERVICE');
CREATE TYPE "OrderStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'CRYPTO', 'MANUAL');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'AWAITING_BUYER', 'AWAITING_SELLER', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');
CREATE TYPE "TicketCategory" AS ENUM ('PAYMENT_ISSUE', 'DOWNLOAD_ISSUE', 'REFUND_REQUEST', 'PRODUCT_PROBLEM', 'SELLER_ISSUE', 'TECHNICAL_ISSUE');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

ALTER TABLE "User"
  ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE TABLE "SellerProfile" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "storeName" TEXT NOT NULL,
  "slug" TEXT NOT NULL, "about" TEXT NOT NULL, "logoUrl" TEXT, "bannerUrl" TEXT,
  "policy" TEXT, "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isSuspended" BOOLEAN NOT NULL DEFAULT false, "suspensionReason" TEXT,
  "totalSales" INTEGER NOT NULL DEFAULT 0,
  "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL, "parentId" TEXT, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL, "seoTitle" TEXT, "seoDescription" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "sellerId" TEXT NOT NULL, "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "shortDescription" TEXT NOT NULL,
  "description" TEXT NOT NULL, "type" "ProductType" NOT NULL DEFAULT 'DOWNLOAD',
  "status" "ProductStatus" NOT NULL DEFAULT 'PENDING', "priceCents" INTEGER NOT NULL,
  "compareAtPriceCents" INTEGER, "currency" TEXT NOT NULL DEFAULT 'USD',
  "coverImageUrl" TEXT, "deliveryNote" TEXT, "downloadLimit" INTEGER NOT NULL DEFAULT 5,
  "downloadExpiryHours" INTEGER NOT NULL DEFAULT 168, "buyersGetUpdates" BOOLEAN NOT NULL DEFAULT true,
  "rejectionReason" TEXT, "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0, "salesCount" INTEGER NOT NULL DEFAULT 0,
  "seoTitle" TEXT, "seoDescription" TEXT, "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductFile" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "description" TEXT, "percentOff" INTEGER,
  "amountOffCents" INTEGER, "minimumCents" INTEGER NOT NULL DEFAULT 0,
  "maxRedemptions" INTEGER, "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL, "orderNumber" TEXT NOT NULL, "invoiceNumber" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL, "couponId" TEXT, "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "currency" TEXT NOT NULL DEFAULT 'USD', "subtotalCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0, "totalCents" INTEGER NOT NULL,
  "buyerEmail" TEXT NOT NULL, "buyerName" TEXT NOT NULL, "paidAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL, "productName" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL, "totalCents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING', "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL, "providerReference" TEXT, "providerPayload" JSONB,
  "failureReason" TEXT, "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadGrant" (
  "id" TEXT NOT NULL, "orderItemId" TEXT NOT NULL, "productFileId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL, "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "maxDownloads" INTEGER NOT NULL DEFAULT 5, "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DownloadGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadEvent" (
  "id" TEXT NOT NULL, "downloadGrantId" TEXT NOT NULL, "ipAddress" TEXT,
  "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "requestedById" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL, "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED', "adminNotes" TEXT,
  "providerReference" TEXT, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "openedById" TEXT NOT NULL,
  "subject" TEXT NOT NULL, "description" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN', "resolution" TEXT, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderMessage" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL, "attachmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL, "ticketNumber" TEXT NOT NULL, "creatorId" TEXT NOT NULL,
  "assigneeId" TEXT, "orderId" TEXT, "category" "TicketCategory" NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN', "subject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketMessage" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL, "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "buyerId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL, "rating" INTEGER NOT NULL, "body" TEXT NOT NULL,
  "mediaUrls" TEXT[], "isVisible" BOOLEAN NOT NULL DEFAULT true, "moderationNote" TEXT,
  "sellerResponse" TEXT, "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductReport" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "details" TEXT, "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "adminNotes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProductReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSection" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "title" TEXT NOT NULL, "subtitle" TEXT,
  "body" TEXT, "imageUrl" TEXT, "ctaLabel" TEXT, "ctaUrl" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");
CREATE UNIQUE INDEX "SellerProfile_slug_key" ON "SellerProfile"("slug");
CREATE INDEX "SellerProfile_isVerified_isSuspended_idx" ON "SellerProfile"("isVerified", "isSuspended");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_sellerId_status_idx" ON "Product"("sellerId", "status");
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");
CREATE INDEX "ProductFile_productId_isActive_idx" ON "ProductFile"("productId", "isActive");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_startsAt_expiresAt_idx" ON "Coupon"("isActive", "startsAt", "expiresAt");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Payment_providerReference_idx" ON "Payment"("providerReference");
CREATE UNIQUE INDEX "DownloadGrant_tokenHash_key" ON "DownloadGrant"("tokenHash");
CREATE INDEX "DownloadGrant_orderItemId_idx" ON "DownloadGrant"("orderItemId");
CREATE INDEX "DownloadGrant_expiresAt_idx" ON "DownloadGrant"("expiresAt");
CREATE INDEX "DownloadEvent_downloadGrantId_createdAt_idx" ON "DownloadEvent"("downloadGrantId", "createdAt");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE INDEX "OrderMessage_orderId_createdAt_idx" ON "OrderMessage"("orderId", "createdAt");
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_creatorId_createdAt_idx" ON "Ticket"("creatorId", "createdAt");
CREATE INDEX "Ticket_status_updatedAt_idx" ON "Ticket"("status", "updatedAt");
CREATE INDEX "Ticket_orderId_idx" ON "Ticket"("orderId");
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");
CREATE INDEX "Review_productId_isVisible_createdAt_idx" ON "Review"("productId", "isVisible", "createdAt");
CREATE INDEX "Review_buyerId_idx" ON "Review"("buyerId");
CREATE INDEX "ProductReport_status_createdAt_idx" ON "ProductReport"("status", "createdAt");
CREATE INDEX "ProductReport_productId_idx" ON "ProductReport"("productId");
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_isVisible_sortOrder_idx" ON "HomepageSection"("isVisible", "sortOrder");

ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductFile" ADD CONSTRAINT "ProductFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadGrant" ADD CONSTRAINT "DownloadGrant_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadGrant" ADD CONSTRAINT "DownloadGrant_productFileId_fkey" FOREIGN KEY ("productFileId") REFERENCES "ProductFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_downloadGrantId_fkey" FOREIGN KEY ("downloadGrantId") REFERENCES "DownloadGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReport" ADD CONSTRAINT "ProductReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductReport" ADD CONSTRAINT "ProductReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

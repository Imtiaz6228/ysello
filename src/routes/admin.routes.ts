import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import {
  DisputeStatus,
  PaymentStatus,
  ProductStatus,
  ProductType,
  RefundStatus,
  ReportStatus,
  Role,
  SellerApplicationStatus,
  TicketStatus,
} from "@prisma/client";
import { z } from "zod";
import {
  requireAuth,
  requireRole,
  requireVerifiedUser,
} from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { sellerReviewSchema } from "../schemas/seller.schemas.js";
import {
  listSellerApplications,
  reviewSellerApplication,
} from "../services/seller.service.js";
import {
  listUsersForAdministration,
  updateUserRole,
} from "../services/user.service.js";
import { prisma } from "../lib/prisma.js";
import { completePayment, issueRefund } from "../services/payment.service.js";
import {
  releaseAvailableSellerEarnings,
  reviewWithdrawalRequest,
} from "../services/finance.service.js";
import {
  autoResolveExpiredDisputes,
  markDisputeTurn,
} from "../services/dispute.service.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import {
  discardPublicImage,
  privateUploadRoot,
  productImageUpload,
  publicUploadUrl,
} from "../middleware/upload.js";
import {
  approveTopup,
  getTopupRequests,
  rejectTopup,
} from "../services/topup.service.js";

export const adminRouter = Router();

const requireStaff = requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);
const requireAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

function parseAdminInventoryLines(raw?: string) {
  if (!raw) return [];
  const lines = [
    ...new Set(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
  if (lines.length > 5000)
    throw new ApiError(
      400,
      "Add at most 5,000 inventory rows at once.",
      "INVENTORY_LIMIT",
    );
  if (lines.some((line) => line.length > 4000))
    throw new ApiError(
      400,
      "Each inventory row must be 4,000 characters or less.",
      "INVENTORY_ROW_TOO_LONG",
    );
  return lines;
}

function slugBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "item"
  );
}

async function uniqueProductSlug(name: string) {
  const base = slugBase(name);
  let slug = base;
  let suffix = 2;
  while (
    await prisma.product.findUnique({ where: { slug }, select: { id: true } })
  )
    slug = `${base}-${suffix++}`;
  return slug;
}

async function ensureAdminSellerProfile(userId: string) {
  const existing = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (existing) {
    if (!existing.isVerified || existing.isSuspended) {
      return prisma.sellerProfile.update({
        where: { userId },
        data: { isVerified: true, isSuspended: false, suspensionReason: null },
      });
    }
    return existing;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  const base = slugBase(
    user?.username ? `${user.username}-official` : "ysello-official",
  );
  let slug = base;
  let suffix = 2;
  while (
    await prisma.sellerProfile.findUnique({
      where: { slug },
      select: { id: true },
    })
  )
    slug = `${base}-${suffix++}`;
  return prisma.sellerProfile.create({
    data: {
      userId,
      storeName: "Ysello Official",
      slug,
      about:
        "Official marketplace catalog managed by the Ysello administration team.",
      policy:
        "Products are reviewed and supported through the marketplace order system.",
      isVerified: true,
    },
  });
}

async function categoryDepth(categoryId: string) {
  let depth = 1;
  let current = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });
  if (!current) return 0;
  while (current.parentId) {
    depth += 1;
    if (depth > 10) break;
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
    if (!current) break;
  }
  return depth;
}

adminRouter.use(requireAuth, requireVerifiedUser);

adminRouter.get(
  "/seller-applications",
  requireStaff,
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: z.nativeEnum(SellerApplicationStatus).optional(),
    });
    const query = querySchema.parse(req.query);
    const applications = await listSellerApplications(query.status);

    res.json({ applications });
  }),
);

adminRouter.patch(
  "/seller-applications/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = sellerReviewSchema.parse(req.body);
    const applicationId = z.string().uuid().parse(req.params.id);
    const application = await reviewSellerApplication(
      applicationId,
      req.auth!.id,
      input.status,
      input.adminNotes,
    );

    res.json({
      message: "Seller application reviewed successfully.",
      application,
    });
  }),
);

adminRouter.get(
  "/seller-applications/:id/documents/:side",
  requireStaff,
  asyncHandler(async (req, res) => {
    const applicationId = z.string().uuid().parse(req.params.id);
    const side = z.enum(["front", "back"]).parse(req.params.side);
    const application = await (prisma.sellerApplication as any).findUnique({
      where: { id: applicationId },
      select: {
        documentFrontPath: true,
        documentFrontOriginalName: true,
        documentBackPath: true,
        documentBackOriginalName: true,
      },
    });

    if (!application) {
      throw new ApiError(
        404,
        "Seller application not found.",
        "APPLICATION_NOT_FOUND",
      );
    }

    const storagePath =
      side === "front"
        ? application.documentFrontPath
        : application.documentBackPath;
    const originalName =
      side === "front"
        ? application.documentFrontOriginalName
        : application.documentBackOriginalName;

    if (!storagePath) {
      throw new ApiError(
        404,
        "Document upload not found for this application.",
        "DOCUMENT_NOT_FOUND",
      );
    }

    const resolvedPath = path.resolve(storagePath);
    const resolvedPrivateRoot = path.resolve(privateUploadRoot);
    if (!resolvedPath.startsWith(`${resolvedPrivateRoot}${path.sep}`)) {
      throw new ApiError(
        403,
        "Document path is outside private uploads.",
        "DOCUMENT_PATH_INVALID",
      );
    }

    try {
      await fs.access(resolvedPath);
    } catch {
      throw new ApiError(
        404,
        "Document file is missing from private storage.",
        "DOCUMENT_FILE_MISSING",
      );
    }

    res.download(resolvedPath, originalName ?? `seller-document-${side}`);
  }),
);

adminRouter.get(
  "/users",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await listUsersForAdministration();
    res.json({
      users: users.map((user) => ({
        ...user,
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: undefined,
      })),
    });
  }),
);

adminRouter.patch(
  "/users/:id/role",
  requireRole(Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
    const userId = z.string().uuid().parse(req.params.id);
    const user = await updateUserRole(req.auth!.id, userId, input.role);
    res.json({ message: "User role updated successfully.", user });
  }),
);

adminRouter.get(
  "/overview",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [
      pendingSellers,
      pendingProducts,
      openTickets,
      openDisputes,
      refundRequests,
      awaitingPayments,
      pendingDeposits,
      pendingWithdrawals,
      users,
      orders,
      lifetimeRevenue,
      todayRevenue,
      monthlyRevenue,
      annualRevenue,
      commission,
      frozenBalance,
      verifiedUsers,
      suspendedUsers,
      totalSellers,
      activeSellers,
      totalBuyers,
      totalProducts,
      approvedProducts,
      rejectedProducts,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      ordersToday,
      ordersThisMonth,
      recentPaidOrders,
      publicStorage,
    ] = await Promise.all([
      prisma.sellerApplication.count({
        where: { status: SellerApplicationStatus.PENDING },
      }),
      prisma.product.count({ where: { status: ProductStatus.PENDING } }),
      prisma.ticket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] } },
      }),
      prisma.dispute.count({
        where: {
          status: {
            in: [
              DisputeStatus.OPEN,
              DisputeStatus.UNDER_REVIEW,
              DisputeStatus.AWAITING_BUYER,
              DisputeStatus.AWAITING_SELLER,
            ],
          },
        },
      }),
      prisma.refund.count({ where: { status: RefundStatus.REQUESTED } }),
      prisma.payment.count({
        where: { status: PaymentStatus.REQUIRES_ACTION },
      }),
      prisma.topupRequest.count({
        where: { status: { in: ["PENDING", "VERIFIED"] } },
      }),
      (prisma as any).withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.order.count(),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          approvedAt: { gte: startOfToday },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          approvedAt: { gte: startOfMonth },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID, approvedAt: { gte: startOfYear } },
        _sum: { amountCents: true },
      }),
      prisma.sellerEarning.aggregate({ _sum: { platformFeeCents: true } }),
      prisma.sellerEarning.aggregate({
        where: { status: "FROZEN" },
        _sum: { netCents: true },
      }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.count({ where: { role: Role.SELLER } }),
      prisma.user.count({ where: { role: Role.SELLER, isSuspended: false } }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: ProductStatus.APPROVED } }),
      prisma.product.count({ where: { status: ProductStatus.REJECTED } }),
      prisma.order.count({
        where: { status: { in: ["DELIVERED", "COMPLETED"] } },
      }),
      prisma.order.count({
        where: { status: { in: ["AWAITING_PAYMENT", "PAID", "PROCESSING"] } },
      }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, approvedAt: { gte: startOfWeek } },
        select: { amountCents: true, approvedAt: true },
        orderBy: { approvedAt: "asc" },
      }),
      prisma.publicUpload.aggregate({ _sum: { sizeBytes: true } }),
    ]);

    const revenueSeries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + index);
      const dayKey = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: recentPaidOrders.reduce(
          (sum, payment) =>
            payment.approvedAt?.toISOString().slice(0, 10) === dayKey
              ? sum + payment.amountCents
              : sum,
          0,
        ),
      };
    });

    const totalRevenueCents = lifetimeRevenue._sum.amountCents ?? 0;
    const marketplaceCommissionCents = commission._sum.platformFeeCents ?? 0;
    res.json({
      overview: {
        pendingSellers,
        pendingProducts,
        openTickets,
        openDisputes,
        refundRequests,
        awaitingPayments,
        pendingDeposits,
        pendingWithdrawals,
        users,
        orders,
        totalRevenueCents,
        todayRevenueCents: todayRevenue._sum.amountCents ?? 0,
        monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
        annualRevenueCents: annualRevenue._sum.amountCents ?? 0,
        marketplaceCommissionCents,
        netProfitCents: marketplaceCommissionCents,
        frozenBalanceCents: frozenBalance._sum.netCents ?? 0,
        verifiedUsers,
        suspendedUsers,
        totalSellers,
        activeSellers,
        totalBuyers,
        totalProducts,
        approvedProducts,
        rejectedProducts,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        ordersToday,
        ordersThisMonth,
        publicStorageBytes: publicStorage._sum.sizeBytes ?? 0,
        conversionRate: users ? Number(((orders / users) * 100).toFixed(1)) : 0,
        revenueSeries,
      },
    });
  }),
);

adminRouter.get(
  "/search",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { q } = z
      .object({ q: z.string().trim().min(2).max(80) })
      .parse(req.query);
    const contains = { contains: q, mode: "insensitive" as const };
    const [users, products, orders, tickets, categories] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: contains },
            { lastName: contains },
            { email: contains },
            { username: contains },
          ],
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: contains },
            { slug: contains },
            { shortDescription: contains },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          seller: { select: { username: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: contains },
            { invoiceNumber: contains },
            { buyerEmail: contains },
            { buyerName: contains },
          ],
        },
        take: 5,
        select: { id: true, orderNumber: true, buyerEmail: true, status: true },
      }),
      prisma.ticket.findMany({
        where: { OR: [{ ticketNumber: contains }, { subject: contains }] },
        take: 5,
        select: { id: true, ticketNumber: true, subject: true, status: true },
      }),
      prisma.category.findMany({
        where: {
          OR: [
            { name: contains },
            { slug: contains },
            { description: contains },
          ],
        },
        take: 5,
        select: { id: true, name: true, slug: true, isActive: true },
      }),
    ]);

    res.json({
      results: [
        ...users.map((entry) => ({
          id: entry.id,
          type: "User",
          label: `${entry.firstName} ${entry.lastName}`,
          meta: `${entry.email} · ${entry.role.replaceAll("_", " ")}`,
          tab: "users",
        })),
        ...products.map((entry) => ({
          id: entry.id,
          type: "Product",
          label: entry.name,
          meta: `${entry.status} · @${entry.seller.username}`,
          tab: "products",
        })),
        ...orders.map((entry) => ({
          id: entry.id,
          type: "Order",
          label: entry.orderNumber,
          meta: `${entry.buyerEmail} · ${entry.status}`,
          tab: "orders",
        })),
        ...tickets.map((entry) => ({
          id: entry.id,
          type: "Ticket",
          label: `${entry.ticketNumber} · ${entry.subject}`,
          meta: entry.status,
          tab: "tickets",
        })),
        ...categories.map((entry) => ({
          id: entry.id,
          type: "Category",
          label: entry.name,
          meta: `/${entry.slug} · ${entry.isActive ? "Visible" : "Hidden"}`,
          tab: "categories",
        })),
      ].slice(0, 16),
    });
  }),
);

adminRouter.patch(
  "/users/:id/suspension",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        suspended: z.boolean(),
        reason: z.string().trim().max(1000).optional(),
      })
      .parse(req.body);
    if (userId === req.auth!.id && input.suspended) {
      res.status(400).json({
        message: "You cannot suspend your own account.",
        code: "SELF_SUSPENSION",
      });
      return;
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: input.suspended,
        suspensionReason: input.suspended ? input.reason : null,
        suspendedAt: input.suspended ? new Date() : null,
      },
    });
    if (input.suspended)
      await prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    res.json({ user });
  }),
);

adminRouter.patch(
  "/sellers/:userId/suspension",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);
    const input = z
      .object({
        suspended: z.boolean(),
        reason: z.string().trim().max(1000).optional(),
      })
      .parse(req.body);
    const seller = await prisma.sellerProfile.update({
      where: { userId },
      data: {
        isSuspended: input.suspended,
        suspensionReason: input.suspended ? input.reason : null,
      },
    });
    res.json({ seller });
  }),
);

adminRouter.get(
  "/products",
  requireStaff,
  asyncHandler(async (req, res) => {
    const status = z
      .nativeEnum(ProductStatus)
      .optional()
      .parse(req.query.status);
    const products = await prisma.product.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        seller: {
          select: {
            id: true,
            email: true,
            username: true,
            sellerProfile: true,
          },
        },
        files: {
          select: {
            id: true,
            displayName: true,
            mimeType: true,
            sizeBytes: true,
            version: true,
            isActive: true,
            createdAt: true,
          },
        },
        inventoryItems: {
          select: { id: true, deliveredAt: true, isActive: true },
        },
      },
    });
    res.json({ products });
  }),
);

adminRouter.post(
  "/products",
  requireAdmin,
  productImageUpload.single("coverImage"),
  asyncHandler(async (req, res) => {
    try {
      const input = z
        .object({
          categoryId: z.string().uuid(),
          name: z.string().trim().min(3).max(160),
          shortDescription: z.string().trim().min(10).max(240),
          description: z.string().trim().min(30).max(20000),
          type: z.nativeEnum(ProductType).default(ProductType.SERVICE),
          priceUsdCents: z.coerce.number().int().min(50).max(100_000_000),
          priceCnyCents: z.preprocess(
            emptyToUndefined,
            z.coerce.number().int().min(0).max(100_000_000).optional(),
          ),
          priceRubCents: z.preprocess(
            emptyToUndefined,
            z.coerce.number().int().min(0).max(100_000_000).optional(),
          ),
          afterSalesServiceHours: z.coerce
            .number()
            .int()
            .min(12)
            .max(8760)
            .default(12),
          deliveryNote: z.preprocess(
            emptyToUndefined,
            z.string().trim().max(1000).optional(),
          ),
          inventoryLines: z.preprocess(
            emptyToUndefined,
            z.string().trim().max(500_000).optional(),
          ),
          publish: z
            .preprocess(
              (value) => value === "true" || value === true,
              z.boolean(),
            )
            .default(true),
        })
        .parse(req.body);

      if (!req.file)
        throw new ApiError(
          400,
          "Choose a clear product image.",
          "PRODUCT_IMAGE_REQUIRED",
        );
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category)
        throw new ApiError(
          404,
          "Choose an active catalog category.",
          "CATEGORY_NOT_FOUND",
        );

      await ensureAdminSellerProfile(req.auth!.id);
      const inventoryLines = parseAdminInventoryLines(input.inventoryLines);
      const canPublish =
        input.publish &&
        (input.type === ProductType.SERVICE || inventoryLines.length > 0);
      const product = await prisma.product.create({
        data: {
          sellerId: req.auth!.id,
          categoryId: input.categoryId,
          name: input.name,
          slug: await uniqueProductSlug(input.name),
          shortDescription: input.shortDescription,
          description: input.description,
          type: input.type,
          status: canPublish ? ProductStatus.APPROVED : ProductStatus.DRAFT,
          priceCents: input.priceUsdCents,
          priceUsdCents: input.priceUsdCents,
          priceCnyCents: input.priceCnyCents ?? 0,
          priceRubCents: input.priceRubCents ?? 0,
          currency: "USD",
          coverImageUrl: publicUploadUrl(req.file.filename),
          afterSalesServiceHours: input.afterSalesServiceHours,
          deliveryNote: input.deliveryNote,
          publishedAt: canPublish ? new Date() : null,
          seoTitle: input.name.slice(0, 70),
          seoDescription: input.shortDescription.slice(0, 170),
          ...(inventoryLines.length
            ? {
                inventoryItems: {
                  createMany: {
                    data: inventoryLines.map((content) => ({
                      content,
                      source: "ADMIN",
                    })),
                  },
                },
              }
            : {}),
        },
        include: {
          category: { include: { parent: { include: { parent: true } } } },
          seller: { include: { sellerProfile: true } },
          files: {
            select: {
              id: true,
              displayName: true,
              mimeType: true,
              sizeBytes: true,
              version: true,
              isActive: true,
              createdAt: true,
            },
          },
          inventoryItems: {
            select: { id: true, deliveredAt: true, isActive: true },
          },
        },
      });

      res.status(201).json({
        product,
        message: canPublish
          ? "Catalog product created and published."
          : "Product saved as a draft. Add inventory before publishing a downloadable item.",
      });
    } catch (error) {
      await discardPublicImage(req.file);
      throw error;
    }
  }),
);

adminRouter.patch(
  "/products/:id/status",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        status: z.enum(["APPROVED", "REJECTED", "REMOVED"]),
        reason: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    if (input.status !== "APPROVED" && !input.reason) {
      res.status(400).json({
        message: "A moderation reason is required.",
        code: "REASON_REQUIRED",
      });
      return;
    }
    const productForModeration = await prisma.product.findUnique({
      where: { id },
      include: {
        files: { where: { isActive: true }, select: { id: true } },
        inventoryItems: {
          where: { isActive: true, orderItemId: null },
          select: { id: true },
        },
      },
    });
    if (!productForModeration)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");

    // Moderation and fulfillment readiness are separate concerns. Admins must
    // be able to approve the listing itself; a download without delivery stock
    // is published as unavailable until the seller adds a file or inventory.
    const deliveryReady =
      productForModeration.type !== ProductType.DOWNLOAD ||
      productForModeration.files.length > 0 ||
      productForModeration.inventoryItems.length > 0;
    const product = await prisma.product.update({
      where: { id },
      data: {
        status: input.status,
        rejectionReason: input.status === "APPROVED" ? null : input.reason,
        publishedAt:
          input.status === "APPROVED"
            ? (productForModeration.publishedAt ?? new Date())
            : null,
      },
    });
    res.json({
      product,
      deliveryReady,
      message:
        input.status === "APPROVED"
          ? deliveryReady
            ? "Product approved and published."
            : "Product approved. It will remain unavailable to purchase until the seller adds delivery inventory."
          : `Product ${input.status.toLowerCase()}.`,
    });
  }),
);

adminRouter.get(
  "/orders",
  requireStaff,
  asyncHandler(async (req, res) => {
    const take = z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .default(100)
      .parse(req.query.take);
    const orders = await prisma.order.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        payment: true,
        items: true,
      },
    });
    res.json({ orders });
  }),
);

adminRouter.post(
  "/payments/:id/approve",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      res
        .status(404)
        .json({ message: "Payment not found.", code: "PAYMENT_NOT_FOUND" });
      return;
    }
    if (!["BANK_TRANSFER", "CRYPTO", "MANUAL"].includes(payment.method)) {
      res.status(400).json({
        message: "Hosted provider payments must be confirmed by the provider.",
        code: "PROVIDER_CONFIRMATION_REQUIRED",
      });
      return;
    }
    const order = await completePayment(payment.orderId, req.auth!.id);
    res.json({ order });
  }),
);

adminRouter.get(
  "/wallet-deposits",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const deposits = await getTopupRequests();
    res.json({ deposits });
  }),
);

adminRouter.patch(
  "/wallet-deposits/:id/approve",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({ adminNotes: z.string().trim().max(1000).optional() })
      .parse(req.body);
    const updated = await approveTopup(id, req.auth!.id, input.adminNotes);
    res.json({
      message: "Deposit approved and user balance updated.",
      deposit: updated,
    });
  }),
);

adminRouter.patch(
  "/wallet-deposits/:id/reject",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({ adminNotes: z.string().trim().max(1000).optional() })
      .parse(req.body);
    const updated = await rejectTopup(id, input.adminNotes);

    res.json({ message: "Deposit rejected.", deposit: updated });
  }),
);

adminRouter.get(
  "/withdrawals",
  requireStaff,
  asyncHandler(async (_req, res) => {
    await releaseAvailableSellerEarnings();
    const withdrawals = await (prisma as any).withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            balanceCents: true,
            sellerBalanceCents: true,
            role: true,
          },
        },
      },
    });
    res.json({ withdrawals });
  }),
);

adminRouter.patch(
  "/withdrawals/:id/:action",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const action = z.enum(["approve", "reject"]).parse(req.params.action);
    const input = z
      .object({ adminNotes: z.string().trim().max(1000).optional() })
      .parse(req.body);
    const withdrawal = await reviewWithdrawalRequest(
      id,
      action,
      req.auth!.id,
      input.adminNotes,
    );
    res.json({
      message:
        action === "approve"
          ? "Withdrawal approved and marked successful."
          : "Withdrawal rejected and balance returned.",
      withdrawal,
    });
  }),
);

adminRouter.get(
  "/refunds",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const refunds = await prisma.refund.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: { include: { payment: true } },
        requestedBy: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });
    res.json({ refunds });
  }),
);

adminRouter.patch(
  "/refunds/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        status: z.nativeEnum(RefundStatus),
        adminNotes: z.string().trim().max(2000).optional(),
        providerReference: z.string().trim().max(300).optional(),
      })
      .parse(req.body);
    if (input.status === RefundStatus.COMPLETED) {
      const refund = await issueRefund(id);
      res.json({ refund });
      return;
    }
    const refundIsResolved = input.status === RefundStatus.REJECTED;
    const refund = await prisma.refund.update({
      where: { id },
      data: { ...input, resolvedAt: refundIsResolved ? new Date() : undefined },
    });
    res.json({ refund });
  }),
);

adminRouter.get(
  "/disputes",
  requireStaff,
  asyncHandler(async (_req, res) => {
    await autoResolveExpiredDisputes();
    const disputes = await prisma.dispute.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        order: {
          include: {
            buyer: { select: { firstName: true, lastName: true, email: true } },
            items: {
              include: {
                product: { select: { name: true, slug: true } },
                seller: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: { select: { name: true, slug: true } },
            seller: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        openedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    res.json({ disputes });
  }),
);

adminRouter.patch(
  "/disputes/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        status: z.nativeEnum(DisputeStatus),
        resolution: z.string().trim().max(4000).optional(),
      })
      .parse(req.body);
    const resolved =
      input.status === DisputeStatus.RESOLVED_BUYER ||
      input.status === DisputeStatus.RESOLVED_SELLER ||
      input.status === DisputeStatus.CLOSED;
    const closedInFavorOf =
      input.status === DisputeStatus.RESOLVED_BUYER
        ? "BUYER"
        : input.status === DisputeStatus.RESOLVED_SELLER
          ? "SELLER"
          : undefined;
    const dispute = await prisma.dispute.update({
      where: { id },
      data: {
        ...input,
        closedInFavorOf,
        awaitingParty: resolved ? null : undefined,
        autoCloseAt: resolved ? null : undefined,
        resolvedAt: resolved ? new Date() : null,
      },
    });
    res.json({ dispute });
  }),
);

adminRouter.post(
  "/disputes/:id/message",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: { include: { items: { select: { sellerId: true } } } },
      },
    });
    if (!dispute)
      throw new ApiError(404, "Dispute not found.", "DISPUTE_NOT_FOUND");
    const message = await prisma.orderMessage.create({
      data: {
        orderId: dispute.orderId,
        authorId: req.auth!.id,
        body: input.body,
      },
      include: { author: { select: { firstName: true, role: true } } },
    });
    await markDisputeTurn(
      dispute.orderId,
      { id: req.auth!.id, role: req.auth!.role as Role },
      dispute.order.buyerId,
      [...new Set(dispute.order.items.map((item) => String(item.sellerId)))],
    );
    res.status(201).json({ message });
  }),
);

adminRouter.get(
  "/tickets",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const tickets = await prisma.ticket.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        creator: { select: { firstName: true, lastName: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { firstName: true, role: true } } },
        },
      },
    });
    res.json({ tickets });
  }),
);

adminRouter.post(
  "/tickets/:id/reply",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        body: z.string().trim().min(1).max(4000),
        status: z.nativeEnum(TicketStatus).default(TicketStatus.PENDING),
        isInternal: z.boolean().default(false),
      })
      .parse(req.body);
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!ticket) {
      res
        .status(404)
        .json({ message: "Ticket not found.", code: "TICKET_NOT_FOUND" });
      return;
    }
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: req.auth!.id,
        body: input.body,
        isInternal: input.isInternal,
      },
    });
    await prisma.ticket.update({
      where: { id },
      data: { status: input.status, assigneeId: req.auth!.id },
    });
    if (!input.isInternal)
      await sendTicketUpdateEmail(
        ticket.creator.email,
        ticket.ticketNumber,
        ticket.subject,
        input.status,
      );
    res.status(201).json({ message });
  }),
);

adminRouter.get(
  "/categories",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ categories });
  }),
);

adminRouter.post(
  "/categories",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(100),
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]+$/)
          .max(100)
          .optional(),
        description: z.string().trim().min(12).max(4000),
        parentId: z.string().uuid().nullable().optional(),
        seoTitle: z.string().trim().max(70).optional(),
        seoDescription: z.string().trim().max(170).optional(),
        sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
      })
      .parse(req.body);
    if (input.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: input.parentId },
        select: { id: true, isActive: true },
      });
      if (!parent?.isActive)
        throw new ApiError(
          400,
          "Choose an active parent category.",
          "INVALID_PARENT_CATEGORY",
        );
      if ((await categoryDepth(input.parentId)) >= 3)
        throw new ApiError(
          400,
          "Categories support up to three levels: category, platform, and listing type.",
          "CATEGORY_DEPTH_LIMIT",
        );
    }
    const base = (
      input.slug ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      "category"
    ).slice(0, 90);
    let slug = base;
    let suffix = 2;
    while (
      await prisma.category.findUnique({
        where: { slug },
        select: { id: true },
      })
    )
      slug = `${base}-${suffix++}`;
    const category = await prisma.category.create({
      data: {
        ...input,
        slug,
        seoTitle: input.seoTitle || input.name,
        seoDescription: input.seoDescription || input.description.slice(0, 170),
        isActive: true,
      },
    });
    res.status(201).json({ category });
  }),
);

adminRouter.patch(
  "/categories/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        description: z.string().trim().min(12).max(4000).optional(),
        parentId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
      })
      .parse(req.body);
    if (input.parentId === id)
      throw new ApiError(
        400,
        "A category cannot be its own parent.",
        "INVALID_PARENT_CATEGORY",
      );
    if (input.parentId) {
      if ((await categoryDepth(input.parentId)) >= 3)
        throw new ApiError(
          400,
          "Categories support up to three levels.",
          "CATEGORY_DEPTH_LIMIT",
        );
      let cursor: string | null = input.parentId;
      while (cursor) {
        if (cursor === id)
          throw new ApiError(
            400,
            "A category cannot be moved inside one of its own children.",
            "CATEGORY_CYCLE",
          );
        const next: { parentId: string | null } | null =
          await prisma.category.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
        cursor = next?.parentId ?? null;
      }
    }
    const category = await prisma.category.update({
      where: { id },
      data: input,
    });
    res.json({ category });
  }),
);

adminRouter.get(
  "/coupons",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ coupons });
  }),
);

adminRouter.post(
  "/coupons",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        code: z.string().trim().min(3).max(40),
        description: z.string().trim().max(500).optional(),
        percentOff: z.number().int().min(1).max(100).optional(),
        amountOffCents: z.number().int().positive().optional(),
        minimumCents: z.number().int().min(0).default(0),
        maxRedemptions: z.number().int().positive().optional(),
        expiresAt: z.coerce.date().optional(),
      })
      .refine(
        (value) => Boolean(value.percentOff) !== Boolean(value.amountOffCents),
        "Choose either percentage or fixed discount.",
      )
      .parse(req.body);
    const coupon = await prisma.coupon.create({
      data: { ...input, code: input.code.toUpperCase() },
    });
    res.status(201).json({ coupon });
  }),
);

adminRouter.get(
  "/homepage",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const sections = await prisma.homepageSection.findMany({
      orderBy: { sortOrder: "asc" },
    });
    res.json({ sections });
  }),
);

adminRouter.put(
  "/homepage/:key",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const key = z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(80)
      .parse(req.params.key);
    const input = z
      .object({
        title: z.string().trim().min(2).max(160),
        subtitle: z.string().trim().max(300).nullable().optional(),
        body: z.string().trim().max(4000).nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        ctaLabel: z.string().trim().max(60).nullable().optional(),
        ctaUrl: z.string().trim().max(300).nullable().optional(),
        isVisible: z.boolean().default(true),
        sortOrder: z.number().int().min(0).max(10000).default(0),
      })
      .parse(req.body);
    const section = await prisma.homepageSection.upsert({
      where: { key },
      create: { key, ...input },
      update: input,
    });
    res.json({ section });
  }),
);

adminRouter.get(
  "/reports",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const reports = await prisma.productReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, slug: true, status: true } },
        reporter: { select: { email: true } },
      },
    });
    res.json({ reports });
  }),
);

adminRouter.patch(
  "/reports/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        status: z.nativeEnum(ReportStatus),
        adminNotes: z.string().trim().max(2000).optional(),
        removeProduct: z.boolean().default(false),
      })
      .parse(req.body);
    const report = await prisma.productReport.update({
      where: { id },
      data: { status: input.status, adminNotes: input.adminNotes },
    });
    if (input.removeProduct)
      await prisma.product.update({
        where: { id: report.productId },
        data: {
          status: ProductStatus.REMOVED,
          rejectionReason:
            input.adminNotes ?? "Removed after a trust and safety report.",
        },
      });
    res.json({ report });
  }),
);

adminRouter.patch(
  "/reviews/:id/moderation",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        isVisible: z.boolean(),
        moderationNote: z.string().trim().max(1000).optional(),
      })
      .parse(req.body);
    const review = await prisma.review.update({ where: { id }, data: input });
    res.json({ review });
  }),
);

adminRouter.get(
  "/reviews",
  requireStaff,
  asyncHandler(async (_req, res) => {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, slug: true } },
        buyer: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.json({ reviews });
  }),
);

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

adminRouter.get(
  "/export/orders.csv",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { payment: true },
    });
    const rows = [
      [
        "order_number",
        "invoice_number",
        "date",
        "buyer_email",
        "status",
        "payment_method",
        "subtotal",
        "discount",
        "total",
        "currency",
      ],
      ...orders.map((order) => [
        order.orderNumber,
        order.invoiceNumber,
        order.createdAt.toISOString(),
        order.buyerEmail,
        order.status,
        order.payment?.method,
        (order.subtotalCents / 100).toFixed(2),
        (order.discountCents / 100).toFixed(2),
        (order.totalCents / 100).toFixed(2),
        order.currency,
      ]),
    ];
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader(
      "content-disposition",
      `attachment; filename="ysello-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
  }),
);

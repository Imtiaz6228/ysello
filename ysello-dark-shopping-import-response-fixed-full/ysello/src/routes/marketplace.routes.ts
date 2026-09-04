import { Router } from "express";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { equivalentCategorySlugs } from "../data/categoryAliases.js";
import { marketplaceTaxonomySlugs } from "../data/marketplaceTaxonomy.js";

export const marketplaceRouter = Router();

const publicCategorySlugs = [...marketplaceTaxonomySlugs];
const DARK_SHOPPING_CATEGORY_TAG = "supplier:dark-shopping";

function publicCategoryPolicyWhere() {
  return {
    isActive: true,
    OR: [
      { slug: { in: publicCategorySlugs } },
      { metaKeywords: { has: DARK_SHOPPING_CATEGORY_TAG } },
    ],
  };
}

function publicListingPolicyWhere() {
  return { category: publicCategoryPolicyWhere() };
}

async function categoryAndDescendantIds(slug: string) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true, slug: true },
  });
  const equivalentSlugs = equivalentCategorySlugs(slug);
  const targets = categories.filter((category) =>
    equivalentSlugs.has(category.slug),
  );
  if (!targets.length) return [];
  const ids = new Set(targets.map((target) => target.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (
        category.parentId &&
        ids.has(category.parentId) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

marketplaceRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: publicCategoryPolicyWhere(),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, slug: true, name: true } },
        _count: {
          select: { products: { where: { status: ProductStatus.APPROVED } } },
        },
      },
    });
    res.json({ categories });
  }),
);

marketplaceRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        q: z.string().trim().max(100).optional(),
        category: z.string().trim().max(100).optional(),
        seller: z.string().trim().max(100).optional(),
        take: z.coerce.number().int().min(1).max(500).default(100),
        sort: z
          .enum(["popular", "price_asc", "price_desc", "newest"])
          .default("popular"),
        stock: z.enum(["all", "in_stock"]).default("all"),
      })
      .parse(req.query);

    const filters: any[] = [];
    if (query.category) {
      const categoryIds = await categoryAndDescendantIds(query.category);
      if (categoryIds.length) filters.push({ categoryId: { in: categoryIds } });
      else filters.push({ categoryId: "__missing_category__" });
    }
    if (query.q) {
      filters.push({
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { shortDescription: { contains: query.q, mode: "insensitive" } },
          { category: { name: { contains: query.q, mode: "insensitive" } } },
        ],
      });
    }

    if (query.stock === "in_stock") {
      filters.push({
        OR: [
          { type: "SERVICE" },
          { files: { some: { isActive: true } } },
          { inventoryItems: { some: { isActive: true, orderItemId: null } } },
          {
            stockQuantity: { gt: 0 },
            darkShoppingListing: {
              is: { isEnabled: true },
            },
          },
        ],
      });
    }

    const orderBy =
      query.sort === "price_asc"
        ? [{ priceCents: "asc" as const }]
        : query.sort === "price_desc"
          ? [{ priceCents: "desc" as const }]
          : query.sort === "newest"
            ? [{ publishedAt: "desc" as const }]
            : [
                { salesCount: "desc" as const },
                { publishedAt: "desc" as const },
              ];

    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        ...publicListingPolicyWhere(),
        seller: query.seller
          ? {
              isSuspended: false,
              sellerProfile: {
                slug: query.seller,
                isSuspended: false,
              },
            }
          : {
              isSuspended: false,
              sellerProfile: { isSuspended: false },
            },
        ...(filters.length ? { AND: filters } : {}),
      },
      take: query.take,
      orderBy,
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        seller: { select: { sellerProfile: true } },
        _count: {
          select: {
            files: { where: { isActive: true } },
            inventoryItems: { where: { isActive: true, orderItemId: null } },
          },
        },
      },
    });
    res.json({ products });
  }),
);

marketplaceRouter.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const slug = z.string().min(1).max(160).parse(req.params.slug);
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.APPROVED,
        ...publicListingPolicyWhere(),
        seller: {
          isSuspended: false,
          sellerProfile: { isSuspended: false },
        },
      },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        seller: { select: { sellerProfile: true } },
        reviews: {
          where: { isVisible: true },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            buyer: { select: { firstName: true, profileImageUrl: true } },
          },
        },
        _count: {
          select: {
            files: { where: { isActive: true } },
            inventoryItems: { where: { isActive: true, orderItemId: null } },
          },
        },
      },
    });
    if (!product) {
      res
        .status(404)
        .json({ message: "Product not found.", code: "PRODUCT_NOT_FOUND" });
      return;
    }
    res.json({ product });
  }),
);

marketplaceRouter.get(
  "/stores",
  asyncHandler(async (_req, res) => {
    const stores = await prisma.sellerProfile.findMany({
      where: {
        isVerified: true,
        isSuspended: false,
        user: { isSuspended: false },
      },
      orderBy: [
        { updatedAt: "desc" },
        { totalSales: "desc" },
        { averageRating: "desc" },
      ],
      take: 12,
      select: {
        storeName: true,
        slug: true,
        about: true,
        logoUrl: true,
        bannerUrl: true,
        averageRating: true,
        totalSales: true,
        createdAt: true,
        user: {
          select: {
            _count: {
              select: {
                products: { where: { isOfficial: true } },
              },
            },
          },
        },
      },
    });
    res.json({
      stores: stores.map(({ user, ...store }) => ({
        ...store,
        isOfficial: user._count.products > 0,
      })),
    });
  }),
);

marketplaceRouter.get(
  "/reviews",
  asyncHandler(async (_req, res) => {
    const reviews = await prisma.review.findMany({
      where: {
        isVisible: true,
        orderItem: {
          order: {
            status: { in: ["DELIVERED", "COMPLETED"] },
          },
        },
        product: {
          status: ProductStatus.APPROVED,
          ...publicListingPolicyWhere(),
          seller: {
            isSuspended: false,
            sellerProfile: { isSuspended: false, isVerified: true },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        buyer: { select: { firstName: true } },
        product: { select: { name: true, slug: true } },
      },
    });
    res.json({ reviews });
  }),
);

marketplaceRouter.get(
  "/stores/:slug",
  asyncHandler(async (req, res) => {
    const slug = z.string().min(1).max(160).parse(req.params.slug);
    const store = await prisma.sellerProfile.findFirst({
      where: {
        slug,
        isVerified: true,
        isSuspended: false,
        user: { isSuspended: false },
      },
      include: {
        user: { select: { id: true, username: true, createdAt: true } },
      },
    });
    if (!store) {
      res
        .status(404)
        .json({ message: "Store not found.", code: "STORE_NOT_FOUND" });
      return;
    }
    const products = await prisma.product.findMany({
      where: {
        sellerId: store.userId,
        status: ProductStatus.APPROVED,
        ...publicListingPolicyWhere(),
      },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        _count: {
          select: {
            files: { where: { isActive: true } },
            inventoryItems: { where: { isActive: true, orderItemId: null } },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });
    res.json({
      store: {
        ...store,
        isOfficial: products.some((product) => product.isOfficial),
      },
      products,
    });
  }),
);

marketplaceRouter.get(
  "/seller-inquiries",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.auth!.id, kind: "SELLER_INQUIRY" },
      include: {
        recipient: {
          select: {
            sellerProfile: { select: { storeName: true, slug: true } },
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    });
    res.json({ sessions });
  }),
);

marketplaceRouter.post(
  "/stores/:slug/contact",
  requireAuth,
  asyncHandler(async (req, res) => {
    const slug = z.string().min(1).max(160).parse(req.params.slug);
    const input = z
      .object({
        message: z.string().trim().min(10).max(4000),
        subject: z.string().trim().min(3).max(120),
        productSlug: z.string().trim().min(1).max(160).optional(),
        contextLabel: z.string().trim().min(1).max(200).optional(),
      })
      .parse(req.body);
    const store = await prisma.sellerProfile.findFirst({
      where: {
        slug,
        isVerified: true,
        isSuspended: false,
        user: { isSuspended: false },
      },
      select: { userId: true, storeName: true },
    });
    if (!store) throw new ApiError(404, "Store not found.", "STORE_NOT_FOUND");
    if (store.userId === req.auth!.id)
      throw new ApiError(
        400,
        "You cannot contact your own store.",
        "OWN_STORE",
      );

    const contextUrl = input.productSlug
      ? `/product/${input.productSlug}`
      : `/stores/${slug}`;
    let session = await prisma.chatSession.findFirst({
      where: {
        userId: req.auth!.id,
        recipientId: store.userId,
        kind: "SELLER_INQUIRY",
        contextUrl,
        resolved: false,
      },
    });
    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: req.auth!.id,
          recipientId: store.userId,
          kind: "SELLER_INQUIRY",
          subject: input.subject,
          contextLabel: input.contextLabel ?? store.storeName,
          contextUrl,
          status: "OPEN",
        },
      });
    }
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          authorId: req.auth!.id,
          role: "buyer",
          body: input.message,
        },
      }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: { status: "OPEN", resolved: false, lastMessageAt: new Date() },
      }),
    ]);
    const updated = await prisma.chatSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    res.status(201).json({
      session: updated,
      message: "Your message was sent to the seller.",
    });
  }),
);

marketplaceRouter.post(
  "/seller-inquiries/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const session = await prisma.chatSession.findFirst({
      where: { id, kind: "SELLER_INQUIRY", userId: req.auth!.id },
    });
    if (!session)
      throw new ApiError(
        404,
        "Seller conversation not found.",
        "INQUIRY_NOT_FOUND",
      );
    const message = await prisma.chatMessage.create({
      data: { sessionId: id, authorId: req.auth!.id, role: "buyer", body },
    });
    await prisma.chatSession.update({
      where: { id },
      data: { status: "OPEN", resolved: false, lastMessageAt: new Date() },
    });
    res.status(201).json({ message });
  }),
);

marketplaceRouter.get(
  "/homepage",
  asyncHandler(async (_req, res) => {
    const sections = await prisma.homepageSection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ sections });
  }),
);

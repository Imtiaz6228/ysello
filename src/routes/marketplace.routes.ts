import { Router } from "express";
import { ProductStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { equivalentCategorySlugs } from "../data/categoryAliases.js";
import { marketplaceTaxonomySlugs } from "../data/marketplaceTaxonomy.js";

export const marketplaceRouter = Router();

const publicCategorySlugs = [...marketplaceTaxonomySlugs];

function publicListingPolicyWhere() {
  return {
    category: {
      isActive: true,
    },
  };
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
      where: { isActive: true, slug: { in: publicCategorySlugs } },
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
        averageRating: true,
        totalSales: true,
        createdAt: true,
      },
    });
    res.json({ stores });
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
    res.json({ store, products });
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

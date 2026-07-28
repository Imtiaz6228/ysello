import fs from "node:fs/promises";
import path from "node:path";
import { Router, type Request } from "express";
import {
  Prisma,
  ProductStatus,
  ProductType,
  Role,
  SellerApplicationStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import {
  imageUpload,
  productFileUpload,
  publicUploadUrl,
  sellerDocumentUpload,
} from "../middleware/upload.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import {
  activeDisputeWhere,
  autoResolveExpiredDisputes,
  markDisputeTurn,
} from "../services/dispute.service.js";
import { getSellerFinanceSummary } from "../services/finance.service.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sellerApplicationSchema } from "../schemas/seller.schemas.js";
import {
  getSellerApplicationForUser,
  submitSellerApplication,
} from "../services/seller.service.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireVerifiedUser);

sellerRouter.get(
  "/application",
  asyncHandler(async (req, res) => {
    const application = await getSellerApplicationForUser(req.auth!.id);

    res.json({ application });
  }),
);

sellerRouter.post(
  "/application",
  sellerDocumentUpload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    try {
      const input = sellerApplicationSchema.parse(req.body);
      const documents = getSellerDocumentFiles(req);
      const application = await submitSellerApplication(
        req.auth!.id,
        input,
        documents,
      );

      res.status(201).json({
        message:
          "Seller application submitted successfully. It is now pending approval / in moderation.",
        application,
      });
    } catch (error) {
      await deleteUploadedApplicationDocuments(req);
      throw error;
    }
  }),
);

const requireSeller = asyncHandler(async (req, _res, next) => {
  if (!req.auth) {
    throw new ApiError(
      403,
      "Approved seller access is required.",
      "SELLER_REQUIRED",
    );
  }

  if (req.auth.role === Role.ADMIN || req.auth.role === Role.SUPER_ADMIN) {
    next();
    return;
  }

  if (req.auth.role !== Role.SELLER) {
    throw new ApiError(
      403,
      "Approved seller access is required.",
      "SELLER_REQUIRED",
    );
  }

  const [application, profile] = await Promise.all([
    prisma.sellerApplication.findUnique({
      where: { userId: req.auth.id },
      select: { status: true },
    }),
    prisma.sellerProfile.findUnique({
      where: { userId: req.auth.id },
      select: { isVerified: true, isSuspended: true },
    }),
  ]);

  if (
    application?.status !== SellerApplicationStatus.APPROVED ||
    !profile?.isVerified ||
    profile.isSuspended
  ) {
    throw new ApiError(
      403,
      "Your seller account is not approved yet or is currently suspended.",
      "SELLER_NOT_APPROVED",
    );
  }

  next();
});

function getSellerDocumentFiles(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const front = files?.documentFront?.[0];
  const back = files?.documentBack?.[0];

  if (!front || !back) {
    throw new ApiError(
      400,
      "Upload both the front and back side of the seller document.",
      "SELLER_DOCUMENTS_REQUIRED",
    );
  }

  return { front, back };
}

async function deleteUploadedApplicationDocuments(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const uploadedFiles = Object.values(files ?? {}).flat();
  await Promise.all(uploadedFiles.map((file) => deleteUploadedFile(file)));
}

const emptyToNull = (value: unknown) =>
  value === "" || value === "null" ? null : value;
const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;
const checkboxToBoolean = (value: unknown) => {
  if (value === "true" || value === "on") return true;
  if (value === "false") return false;
  return value;
};

const optionalCents = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(0).max(100_000_000).optional(),
);
const optionalText = (max = 240) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());
const stringList = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* comma-separated fallback */
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  },
  z.array(z.string().trim().min(1).max(160)).max(50),
);
const jsonObject = z.preprocess((value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}, z.record(z.unknown()));

const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(160),
  shortDescription: z.string().trim().min(10).max(240),
  description: z.string().trim().min(30).max(20000),
  type: z.nativeEnum(ProductType).default(ProductType.DOWNLOAD),
  priceCents: optionalCents,
  priceUsdCents: optionalCents,
  priceCnyCents: optionalCents.default(0),
  priceRubCents: optionalCents.default(0),
  compareAtPriceCents: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive().nullable().optional(),
  ),
  currency: z.string().length(3).default("USD"),
  coverImageUrl: z.preprocess(
    emptyToNull,
    z.string().url().nullable().optional(),
  ),
  deliveryNote: z.preprocess(
    emptyToNull,
    z.string().trim().max(1000).nullable().optional(),
  ),
  downloadLimit: z.coerce.number().int().min(1).max(100).default(5),
  downloadExpiryHours: z.coerce.number().int().min(1).max(8760).default(168),
  afterSalesServiceHours: z.coerce.number().int().min(12).max(8760).default(12),
  buyersGetUpdates: z.preprocess(checkboxToBoolean, z.boolean().default(true)),
  inventoryLines: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500_000).optional(),
  ),
  seoTitle: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(70).optional(),
  ),
  seoDescription: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(170).optional(),
  ),
  galleryUrls: stringList.default([]),
  videoUrl: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  brand: optionalText(120),
  platform: optionalText(100),
  region: optionalText(100),
  country: optionalText(100),
  server: optionalText(100),
  language: optionalText(80),
  deliveryMethod: optionalText(100),
  productKind: optionalText(100),
  condition: optionalText(100),
  stockType: optionalText(100),
  duration: optionalText(100),
  warranty: optionalText(500),
  refundPolicy: optionalText(2000),
  stockQuantity: z.coerce.number().int().min(0).max(10_000_000).default(0),
  minimumOrder: z.coerce.number().int().min(1).max(100_000).default(1),
  maximumOrder: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(100_000).nullable().optional(),
  ),
  sku: optionalText(100),
  tags: stringList.default([]),
  salePriceCents: optionalCents,
  wholesalePriceCents: optionalCents,
  discountPercent: z.coerce.number().int().min(0).max(100).default(0),
  couponSupport: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
  isFeatured: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
  isRecommended: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
  instantDelivery: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
  manualDelivery: z.preprocess(checkboxToBoolean, z.boolean().default(true)),
  digitalDownload: z.preprocess(checkboxToBoolean, z.boolean().default(false)),
  productAttributes: jsonObject.default({}),
  translations: jsonObject.default({}),
});

function parseInventoryLines(raw?: string | null) {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^"(.*)"$/, "$1").trim())
    .filter(Boolean);
  const unique = [...new Set(lines)];
  if (unique.length > 5000) {
    throw new ApiError(
      400,
      "Upload at most 5,000 product inventory rows at once.",
      "INVENTORY_LIMIT",
    );
  }
  const tooLong = unique.find((line) => line.length > 4000);
  if (tooLong) {
    throw new ApiError(
      400,
      "Each product inventory row must be 4,000 characters or less.",
      "INVENTORY_ROW_TOO_LONG",
    );
  }
  return unique;
}

function productDataFromInput(
  input: z.infer<typeof productSchema>,
  coverImageUrl: string | null,
) {
  const priceUsdCents = input.priceUsdCents ?? input.priceCents;
  if (!priceUsdCents || priceUsdCents < 50) {
    throw new ApiError(
      400,
      "Set a USD price of at least $0.50.",
      "USD_PRICE_REQUIRED",
    );
  }

  return {
    categoryId: input.categoryId,
    name: input.name,
    shortDescription: input.shortDescription,
    description: input.description,
    type: input.type,
    priceCents: priceUsdCents,
    priceUsdCents,
    priceCnyCents: input.priceCnyCents ?? 0,
    priceRubCents: input.priceRubCents ?? 0,
    compareAtPriceCents: input.compareAtPriceCents,
    currency: "USD",
    coverImageUrl,
    deliveryNote: input.deliveryNote,
    downloadLimit: input.downloadLimit,
    downloadExpiryHours: input.downloadExpiryHours,
    afterSalesServiceHours: input.afterSalesServiceHours,
    buyersGetUpdates: input.buyersGetUpdates,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    galleryUrls: input.galleryUrls,
    videoUrl: input.videoUrl,
    brand: input.brand,
    platform: input.platform,
    region: input.region,
    country: input.country,
    server: input.server,
    language: input.language,
    deliveryMethod: input.deliveryMethod,
    productKind: input.productKind,
    condition: input.condition,
    stockType: input.stockType,
    duration: input.duration,
    warranty: input.warranty,
    refundPolicy: input.refundPolicy,
    stockQuantity: input.stockQuantity,
    minimumOrder: input.minimumOrder,
    maximumOrder: input.maximumOrder,
    sku: input.sku,
    tags: input.tags,
    salePriceCents: input.salePriceCents,
    wholesalePriceCents: input.wholesalePriceCents,
    discountPercent: input.discountPercent,
    couponSupport: input.couponSupport,
    isFeatured: input.isFeatured,
    isRecommended: input.isRecommended,
    instantDelivery: input.instantDelivery,
    manualDelivery: input.manualDelivery,
    digitalDownload: input.digitalDownload,
    productAttributes: input.productAttributes as Prisma.InputJsonValue,
    translations: input.translations as Prisma.InputJsonValue,
  };
}

async function deleteUploadedFile(file?: Express.Multer.File) {
  if (!file) return;
  await fs.unlink(file.path).catch(() => undefined);
}

sellerRouter.get(
  "/categories",
  requireSeller,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { parent: { select: { id: true, slug: true, name: true } } },
    });
    res.json({ categories });
  }),
);

sellerRouter.get(
  "/finance",
  requireSeller,
  asyncHandler(async (req, res) => {
    const summary = await getSellerFinanceSummary(req.auth!.id);
    res.json({ summary });
  }),
);

sellerRouter.get(
  "/profile",
  requireSeller,
  asyncHandler(async (req, res) => {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.auth!.id },
    });
    res.json({ profile });
  }),
);

sellerRouter.patch(
  "/profile",
  requireSeller,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        about: z.string().trim().min(20).max(5000).optional(),
        logoUrl: z.string().url().nullable().optional(),
        bannerUrl: z.string().url().nullable().optional(),
        policy: z.string().trim().max(5000).nullable().optional(),
      })
      .parse(req.body);
    const profile = await prisma.sellerProfile.update({
      where: { userId: req.auth!.id },
      data: input,
    });
    res.json({ profile });
  }),
);

sellerRouter.post(
  "/profile/logo",
  requireSeller,
  imageUpload.single("logo"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a store logo image.",
          "SELLER_LOGO_REQUIRED",
        );
      const profile = await prisma.sellerProfile.update({
        where: { userId: req.auth!.id },
        data: { logoUrl: publicUploadUrl(req.file.filename) },
      });
      res.json({ profile, message: "Store logo uploaded." });
    } catch (error) {
      await deleteUploadedFile(req.file);
      throw error;
    }
  }),
);

sellerRouter.post(
  "/profile/banner",
  requireSeller,
  imageUpload.single("banner"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a store banner image.",
          "SELLER_BANNER_REQUIRED",
        );
      const profile = await prisma.sellerProfile.update({
        where: { userId: req.auth!.id },
        data: { bannerUrl: publicUploadUrl(req.file.filename) },
      });
      res.json({ profile, message: "Store banner uploaded." });
    } catch (error) {
      await deleteUploadedFile(req.file);
      throw error;
    }
  }),
);

sellerRouter.get(
  "/products",
  requireSeller,
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { sellerId: req.auth!.id },
      orderBy: { updatedAt: "desc" },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        files: { where: { isActive: true } },
        inventoryItems: {
          select: {
            id: true,
            deliveredAt: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });
    res.json({ products });
  }),
);

sellerRouter.post(
  "/products",
  requireSeller,
  imageUpload.single("coverImage"),
  asyncHandler(async (req, res) => {
    try {
      const input = productSchema.parse(req.body);
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a clear product image before creating the listing.",
          "PRODUCT_IMAGE_REQUIRED",
        );
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category)
        throw new ApiError(
          400,
          "Choose a valid active category path.",
          "CATEGORY_NOT_FOUND",
        );
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId: req.auth!.id },
        select: { id: true, isVerified: true, isSuspended: true },
      });
      if (!sellerProfile?.isVerified || sellerProfile.isSuspended)
        throw new ApiError(
          403,
          "Complete seller approval before creating products.",
          "SELLER_NOT_APPROVED",
        );
      const inventoryLines = parseInventoryLines(input.inventoryLines);
      const base =
        [input.name, input.platform, input.productKind, input.region]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 132) || "product";
      const coverImageUrl = publicUploadUrl(req.file.filename);
      const productData = productDataFromInput(input, coverImageUrl);
      const status = ProductStatus.PENDING;
      const product = await prisma.product.create({
        data: {
          ...productData,
          slug: `${base}-i${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`,
          sellerId: req.auth!.id,
          status,
          ...(inventoryLines.length
            ? {
                inventoryItems: {
                  createMany: {
                    data: inventoryLines.map((content) => ({
                      content,
                      source: "MANUAL",
                    })),
                  },
                },
              }
            : {}),
        },
        include: {
          category: { include: { parent: { include: { parent: true } } } },
          files: true,
          inventoryItems: {
            select: { id: true, deliveredAt: true, isActive: true },
          },
        },
      });
      res
        .status(201)
        .json({ product, message: "Product submitted for admin approval." });
    } catch (error) {
      await deleteUploadedFile(req.file);
      throw error;
    }
  }),
);

sellerRouter.patch(
  "/products/:id",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
    });
    if (!existing)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");

    const data: any = { ...input };
    delete data.inventoryLines;
    if (input.priceUsdCents !== undefined || input.priceCents !== undefined) {
      const priceUsdCents = input.priceUsdCents ?? input.priceCents;
      if (!priceUsdCents || priceUsdCents < 50)
        throw new ApiError(
          400,
          "Set a USD price of at least $0.50.",
          "USD_PRICE_REQUIRED",
        );
      data.priceCents = priceUsdCents;
      data.priceUsdCents = priceUsdCents;
    }
    if (input.currency) data.currency = "USD";
    data.status =
      existing.status === ProductStatus.APPROVED
        ? ProductStatus.PENDING
        : existing.status;

    const product = await prisma.product.update({ where: { id }, data });
    const inventoryLines = parseInventoryLines(input.inventoryLines);
    if (inventoryLines.length) {
      await prisma.productInventoryItem.createMany({
        data: inventoryLines.map((content) => ({
          productId: id,
          content,
          source: "MANUAL",
        })),
      });
    }
    res.json({ product });
  }),
);

sellerRouter.delete(
  "/products/:id",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const existing = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
      select: { id: true },
    });
    if (!existing)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const product = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REMOVED },
    });
    res.json({ product, message: "Product removed from your catalog." });
  }),
);

sellerRouter.post(
  "/products/:id/duplicate",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const existing = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
    });
    if (!existing)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const {
      id: _id,
      slug: _slug,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      publishedAt: _publishedAt,
      rejectionReason: _rejectionReason,
      salesCount: _salesCount,
      reviewCount: _reviewCount,
      averageRating: _averageRating,
      ...copy
    } = existing;
    const product = await prisma.product.create({
      data: {
        ...copy,
        productAttributes: (copy.productAttributes ??
          {}) as Prisma.InputJsonValue,
        translations: (copy.translations ?? {}) as Prisma.InputJsonValue,
        name: `${existing.name} (Copy)`.slice(0, 160),
        slug: `${existing.slug.slice(0, 140)}-copy-${crypto.randomUUID().slice(0, 6)}`,
        status: ProductStatus.DRAFT,
      },
    });
    res
      .status(201)
      .json({ product, message: "Product duplicated as a draft." });
  }),
);

sellerRouter.patch(
  "/products/:id/status",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { status } = z
      .object({
        status: z.enum([
          "DRAFT",
          "PENDING",
          "HIDDEN",
          "PAUSED",
          "OUT_OF_STOCK",
          "REMOVED",
        ]),
      })
      .parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
      select: { id: true },
    });
    if (!existing)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const product = await prisma.product.update({
      where: { id },
      data: {
        status: status as ProductStatus,
        rejectionReason: status === "PENDING" ? null : undefined,
      },
    });
    res.json({
      product,
      message: `Product status changed to ${status.toLowerCase().replaceAll("_", " ")}.`,
    });
  }),
);

sellerRouter.patch(
  "/products/bulk/update",
  requireSeller,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        status: z
          .enum([
            "DRAFT",
            "PENDING",
            "HIDDEN",
            "PAUSED",
            "OUT_OF_STOCK",
            "REMOVED",
          ])
          .optional(),
        categoryId: z.string().uuid().optional(),
        priceDeltaPercent: z.number().min(-90).max(1000).optional(),
        stockQuantity: z.number().int().min(0).max(10_000_000).optional(),
      })
      .parse(req.body);
    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      });
      if (!category)
        throw new ApiError(
          400,
          "Choose a valid active category.",
          "CATEGORY_NOT_FOUND",
        );
    }
    const owned = await prisma.product.findMany({
      where: { id: { in: input.ids }, sellerId: req.auth!.id },
      select: { id: true, priceCents: true, priceUsdCents: true },
    });
    if (!owned.length)
      throw new ApiError(
        404,
        "No matching products found.",
        "PRODUCT_NOT_FOUND",
      );
    await prisma.$transaction(
      owned.map((product) =>
        prisma.product.update({
          where: { id: product.id },
          data: {
            ...(input.status ? { status: input.status as ProductStatus } : {}),
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
            ...(input.stockQuantity !== undefined
              ? { stockQuantity: input.stockQuantity }
              : {}),
            ...(input.priceDeltaPercent !== undefined
              ? {
                  priceCents: Math.max(
                    50,
                    Math.round(
                      product.priceCents * (1 + input.priceDeltaPercent / 100),
                    ),
                  ),
                  priceUsdCents: Math.max(
                    50,
                    Math.round(
                      product.priceUsdCents *
                        (1 + input.priceDeltaPercent / 100),
                    ),
                  ),
                }
              : {}),
          },
        }),
      ),
    );
    res.json({
      updated: owned.length,
      message: `${owned.length} products updated.`,
    });
  }),
);

sellerRouter.get(
  "/products-export.csv",
  requireSeller,
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { sellerId: req.auth!.id },
      include: { category: { select: { slug: true } } },
      orderBy: { updatedAt: "desc" },
    });
    const quote = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      [
        "id",
        "sku",
        "title",
        "category",
        "status",
        "price_usd",
        "stock",
        "updated_at",
      ],
      ...products.map((product) => [
        product.id,
        product.sku,
        product.name,
        product.category.slug,
        product.status,
        (product.priceUsdCents / 100).toFixed(2),
        product.stockQuantity,
        product.updatedAt.toISOString(),
      ]),
    ];
    res
      .type("text/csv")
      .attachment("seller-products.csv")
      .send(rows.map((row) => row.map(quote).join(",")).join("\n"));
  }),
);

sellerRouter.post(
  "/products-import",
  requireSeller,
  productFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a CSV product file.",
          "PRODUCT_IMPORT_REQUIRED",
        );
      const text = await fs.readFile(req.file.path, "utf8");
      const parseRow = (row: string) => {
        const values: string[] = [];
        let value = "";
        let quoted = false;
        for (let index = 0; index < row.length; index += 1) {
          const char = row[index];
          if (char === '"' && quoted && row[index + 1] === '"') {
            value += '"';
            index += 1;
          } else if (char === '"') quoted = !quoted;
          else if (char === "," && !quoted) {
            values.push(value.trim());
            value = "";
          } else value += char;
        }
        values.push(value.trim());
        return values;
      };
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2)
        throw new ApiError(
          400,
          "The CSV must include a header and at least one product.",
          "PRODUCT_IMPORT_EMPTY",
        );
      if (lines.length > 1001)
        throw new ApiError(
          400,
          "Import at most 1,000 products at once.",
          "PRODUCT_IMPORT_LIMIT",
        );
      const headers = parseRow(lines[0]).map((header) =>
        header.toLowerCase().replaceAll(" ", "_"),
      );
      const required = [
        "category_slug",
        "title",
        "short_description",
        "description",
        "price_usd",
      ];
      if (required.some((header) => !headers.includes(header)))
        throw new ApiError(
          400,
          `CSV columns required: ${required.join(", ")}.`,
          "PRODUCT_IMPORT_COLUMNS",
        );
      const records = lines
        .slice(1)
        .map((line) =>
          Object.fromEntries(
            parseRow(line).map((value, index) => [headers[index], value]),
          ),
        );
      const categorySlugs = [
        ...new Set(records.map((record) => record.category_slug)),
      ];
      const categories = await prisma.category.findMany({
        where: { slug: { in: categorySlugs }, isActive: true },
        select: { id: true, slug: true },
      });
      const categoryBySlug = new Map(
        categories.map((category) => [category.slug, category.id]),
      );
      const missing = categorySlugs.filter((slug) => !categoryBySlug.has(slug));
      if (missing.length)
        throw new ApiError(
          400,
          `Unknown category slug: ${missing.slice(0, 5).join(", ")}.`,
          "PRODUCT_IMPORT_CATEGORY",
        );
      const products = await prisma.$transaction(
        records.map((record) => {
          const priceUsdCents = Math.round(Number(record.price_usd) * 100);
          if (!Number.isFinite(priceUsdCents) || priceUsdCents < 50)
            throw new ApiError(
              400,
              `Invalid price for ${record.title || "product"}.`,
              "PRODUCT_IMPORT_PRICE",
            );
          const base =
            record.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "product";
          return prisma.product.create({
            data: {
              sellerId: req.auth!.id,
              categoryId: categoryBySlug.get(record.category_slug)!,
              name: record.title.slice(0, 160),
              slug: `${base.slice(0, 140)}-${crypto.randomUUID().slice(0, 8)}`,
              shortDescription: record.short_description.slice(0, 240),
              description: record.description.slice(0, 20000),
              type:
                record.type === "SERVICE"
                  ? ProductType.SERVICE
                  : ProductType.DOWNLOAD,
              status: ProductStatus.DRAFT,
              priceCents: priceUsdCents,
              priceUsdCents,
              currency: "USD",
              sku: record.sku?.slice(0, 100) || null,
              stockQuantity: Math.max(
                0,
                Number.parseInt(record.stock_quantity || "0", 10) || 0,
              ),
              tags: record.tags
                ? record.tags
                    .split("|")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .slice(0, 50)
                : [],
              digitalDownload: record.type !== "SERVICE",
              manualDelivery: record.type === "SERVICE",
              translations: {
                en: {
                  title: record.title,
                  shortDescription: record.short_description,
                  description: record.description,
                },
              },
            },
          });
        }),
      );
      res.status(201).json({
        imported: products.length,
        message: `${products.length} products imported as drafts.`,
      });
    } finally {
      await deleteUploadedFile(req.file);
    }
  }),
);

sellerRouter.post(
  "/products/:id/submit",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const existing = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
      include: {
        files: { where: { isActive: true } },
        inventoryItems: { where: { isActive: true, orderItemId: null } },
      },
    });
    if (!existing)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    if (existing.afterSalesServiceHours < 12) {
      throw new ApiError(
        400,
        "After-sales service time must be at least 12 hours.",
        "AFTER_SALES_MINIMUM",
      );
    }
    const product = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.PENDING, rejectionReason: null },
    });
    res.json({ product, message: "Product submitted for admin approval." });
  }),
);

sellerRouter.post(
  "/products/:id/image",
  requireSeller,
  imageUpload.single("coverImage"),
  asyncHandler(async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a product image.",
          "PRODUCT_IMAGE_REQUIRED",
        );
      const existing = await prisma.product.findFirst({
        where: { id, sellerId: req.auth!.id },
      });
      if (!existing)
        throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
      const product = await prisma.product.update({
        where: { id },
        data: {
          coverImageUrl: publicUploadUrl(req.file.filename),
          status:
            existing.status === ProductStatus.APPROVED
              ? ProductStatus.PENDING
              : existing.status,
        },
      });
      res.json({ product });
    } catch (error) {
      await deleteUploadedFile(req.file);
      throw error;
    }
  }),
);

sellerRouter.post(
  "/products/:id/files",
  requireSeller,
  productFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const product = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
    });
    if (!product)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    if (!req.file)
      throw new ApiError(
        400,
        "Choose a product file.",
        "PRODUCT_FILE_REQUIRED",
      );
    const latest = await prisma.productFile.aggregate({
      where: { productId: id },
      _max: { version: true },
    });
    const file = await prisma.productFile.create({
      data: {
        productId: id,
        displayName: req.file.originalname,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        version: (latest._max.version ?? 0) + 1,
      },
    });
    if (product.buyersGetUpdates) {
      const eligibleItems = await prisma.orderItem.findMany({
        where: {
          productId: id,
          order: {
            paidAt: { not: null },
            status: { notIn: ["REFUNDED", "CANCELLED"] },
          },
        },
        select: { id: true },
      });
      if (eligibleItems.length) {
        await prisma.downloadGrant.createMany({
          data: eligibleItems.map((item) => ({
            orderItemId: item.id,
            productFileId: file.id,
            tokenHash: sha256(randomToken(40)),
            maxDownloads: product.downloadLimit,
            expiresAt: new Date(
              Date.now() + product.downloadExpiryHours * 60 * 60 * 1000,
            ),
          })),
        });
      }
    }
    res.status(201).json({ file });
  }),
);

sellerRouter.get(
  "/files/:id/download",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const file = await prisma.productFile.findFirst({
      where: { id, product: { sellerId: req.auth!.id } },
      select: { storagePath: true, displayName: true },
    });
    if (!file)
      throw new ApiError(
        404,
        "Uploaded product file not found.",
        "PRODUCT_FILE_NOT_FOUND",
      );
    res.download(path.resolve(file.storagePath), file.displayName);
  }),
);

sellerRouter.post(
  "/products/:id/inventory/manual",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { inventoryLines } = z
      .object({ inventoryLines: z.string().trim().min(1).max(500_000) })
      .parse(req.body);
    const product = await prisma.product.findFirst({
      where: { id, sellerId: req.auth!.id },
    });
    if (!product)
      throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const lines = parseInventoryLines(inventoryLines);
    if (!lines.length)
      throw new ApiError(
        400,
        "Add at least one inventory row.",
        "INVENTORY_REQUIRED",
      );
    await prisma.productInventoryItem.createMany({
      data: lines.map((content) => ({
        productId: id,
        content,
        source: "MANUAL",
      })),
    });
    res.status(201).json({ count: lines.length });
  }),
);

sellerRouter.post(
  "/products/:id/inventory/file",
  requireSeller,
  productFileUpload.single("file"),
  asyncHandler(async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const product = await prisma.product.findFirst({
        where: { id, sellerId: req.auth!.id },
      });
      if (!product)
        throw new ApiError(404, "Product not found.", "PRODUCT_NOT_FOUND");
      if (!req.file)
        throw new ApiError(
          400,
          "Choose a text or CSV inventory file.",
          "INVENTORY_FILE_REQUIRED",
        );
      const text = await fs.readFile(req.file.path, "utf8");
      const lines = parseInventoryLines(text);
      if (!lines.length)
        throw new ApiError(
          400,
          "The inventory file did not contain any rows.",
          "INVENTORY_FILE_EMPTY",
        );
      await prisma.productInventoryItem.createMany({
        data: lines.map((content) => ({
          productId: id,
          content,
          source: "FILE",
        })),
      });
      res.status(201).json({ count: lines.length });
    } finally {
      await deleteUploadedFile(req.file);
    }
  }),
);

sellerRouter.get(
  "/orders",
  requireSeller,
  asyncHandler(async (req, res) => {
    const items = await prisma.orderItem.findMany({
      where: { sellerId: req.auth!.id },
      orderBy: { order: { createdAt: "desc" } },
      include: {
        order: {
          include: {
            payment: true,
            buyer: { select: { firstName: true, lastName: true, email: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            disputes: { orderBy: { createdAt: "desc" }, take: 1 },
            refunds: { orderBy: { createdAt: "desc" } },
          },
        },
        product: true,
        sellerEarning: true,
        inventoryItems: {
          where: { isActive: true },
          select: { id: true, content: true, source: true, deliveredAt: true },
        },
      },
    });
    res.json({ items });
  }),
);

sellerRouter.get(
  "/disputes",
  requireSeller,
  asyncHandler(async (req, res) => {
    await autoResolveExpiredDisputes({
      order: { items: { some: { sellerId: req.auth!.id } } },
    });
    const disputes = await prisma.dispute.findMany({
      where: { order: { items: { some: { sellerId: req.auth!.id } } } },
      orderBy: { updatedAt: "desc" },
      include: {
        order: {
          include: {
            buyer: { select: { firstName: true, lastName: true, email: true } },
            items: {
              include: {
                product: {
                  select: { name: true, slug: true, coverImageUrl: true },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: {
              select: { name: true, slug: true, coverImageUrl: true },
            },
          },
        },
        openedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.json({ disputes });
  }),
);

sellerRouter.post(
  "/orders/:id/refund",
  requireSeller,
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        reason: z.string().trim().min(10).max(2000),
        amountCents: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: { some: { sellerId: req.auth!.id } },
        paidAt: { not: null },
      },
      include: { items: { where: { sellerId: req.auth!.id } } },
    });
    if (!order)
      throw new ApiError(
        404,
        "Paid seller order not found.",
        "ORDER_NOT_FOUND",
      );
    const sellerTotal = order.items.reduce(
      (sum, item) => sum + item.totalCents,
      0,
    );
    const amountCents = Math.min(input.amountCents ?? sellerTotal, sellerTotal);
    const refund = await prisma.refund.create({
      data: {
        orderId,
        requestedById: req.auth!.id,
        amountCents,
        reason: `Seller refund request: ${input.reason}`,
      },
    });
    await prisma.orderMessage.create({
      data: {
        orderId,
        authorId: req.auth!.id,
        body: `Seller submitted a refund for $${(amountCents / 100).toFixed(2)}. Reason: ${input.reason}`,
      },
    });
    await markDisputeTurn(
      orderId,
      { id: req.auth!.id, role: req.auth!.role as Role },
      order.buyerId,
      [req.auth!.id],
    );
    res
      .status(201)
      .json({ refund, message: "Refund request sent to admin for approval." });
  }),
);

sellerRouter.post(
  "/orders/:orderId/items/:itemId/replace",
  requireSeller,
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const itemId = z.string().uuid().parse(req.params.itemId);
    const input = z
      .object({
        quantity: z.number().int().min(1).max(100).optional(),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(req.body);
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        sellerId: req.auth!.id,
        order: { paidAt: { not: null } },
      },
      include: {
        order: {
          include: {
            disputes: {
              where: activeDisputeWhere(),
              orderBy: { updatedAt: "desc" },
            },
          },
        },
        product: { select: { name: true } },
        inventoryItems: {
          where: { isActive: true, deliveredAt: { not: null } },
          orderBy: { deliveredAt: "asc" },
          select: { id: true },
        },
      },
    });
    if (!orderItem)
      throw new ApiError(
        404,
        "Paid seller order item not found.",
        "ORDER_ITEM_NOT_FOUND",
      );
    const dispute = orderItem.order.disputes.find(
      (entry) => !entry.orderItemId || entry.orderItemId === orderItem.id,
    );
    if (!dispute)
      throw new ApiError(
        409,
        "Replacement is available only while this item has an open dispute.",
        "ACTIVE_DISPUTE_REQUIRED",
      );
    if (!orderItem.inventoryItems.length)
      throw new ApiError(
        409,
        "This product has no delivered account inventory to replace.",
        "REPLACEMENT_NOT_SUPPORTED",
      );

    const replacementCount = Math.min(
      input.quantity ?? orderItem.quantity,
      orderItem.inventoryItems.length,
    );
    const result = await prisma.$transaction(async (tx) => {
      const replacements = await tx.productInventoryItem.findMany({
        where: {
          productId: orderItem.productId,
          isActive: true,
          orderItemId: null,
        },
        orderBy: { createdAt: "asc" },
        take: replacementCount,
        select: { id: true },
      });
      if (replacements.length < replacementCount) {
        throw new ApiError(
          409,
          `Only ${replacements.length} replacement item${replacements.length === 1 ? " is" : "s are"} available.`,
          "REPLACEMENT_OUT_OF_STOCK",
        );
      }
      const retiredIds = orderItem.inventoryItems
        .slice(0, replacementCount)
        .map((item) => item.id);
      await tx.productInventoryItem.updateMany({
        where: { id: { in: retiredIds } },
        data: { isActive: false },
      });
      await tx.productInventoryItem.updateMany({
        where: { id: { in: replacements.map((item) => item.id) } },
        data: { orderItemId: orderItem.id, deliveredAt: new Date() },
      });
      const message = await tx.orderMessage.create({
        data: {
          orderId,
          authorId: req.auth!.id,
          body: `Seller replaced ${replacementCount} item${replacementCount === 1 ? "" : "s"} for ${orderItem.productName}.${input.note ? ` Note: ${input.note}` : ""}`,
        },
        include: {
          author: { select: { id: true, firstName: true, role: true } },
        },
      });
      return { replacementCount, message };
    });
    await markDisputeTurn(
      orderId,
      { id: req.auth!.id, role: req.auth!.role as Role },
      orderItem.order.buyerId,
      [req.auth!.id],
    );
    res.status(201).json({
      replacementCount: result.replacementCount,
      chatMessage: result.message,
      message: `${result.replacementCount} replacement item${result.replacementCount === 1 ? "" : "s"} delivered to the buyer.`,
    });
  }),
);

sellerRouter.post(
  "/reviews/:id/respond",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { response } = z
      .object({ response: z.string().trim().min(2).max(2000) })
      .parse(req.body);
    const review = await prisma.review.findFirst({
      where: { id, product: { sellerId: req.auth!.id } },
    });
    if (!review)
      throw new ApiError(404, "Review not found.", "REVIEW_NOT_FOUND");
    const updated = await prisma.review.update({
      where: { id },
      data: { sellerResponse: response, respondedAt: new Date() },
    });
    res.json({ review: updated });
  }),
);

sellerRouter.get(
  "/reviews",
  requireSeller,
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { product: { sellerId: req.auth!.id } },
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true, slug: true } },
        buyer: { select: { firstName: true } },
      },
    });
    res.json({ reviews });
  }),
);

sellerRouter.get(
  "/tickets",
  requireSeller,
  asyncHandler(async (req, res) => {
    const tickets = await prisma.ticket.findMany({
      where: { order: { items: { some: { sellerId: req.auth!.id } } } },
      orderBy: { updatedAt: "desc" },
      include: {
        creator: { select: { firstName: true, email: true } },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    res.json({ tickets });
  }),
);

sellerRouter.post(
  "/tickets/:id/reply",
  requireSeller,
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const ticket = await prisma.ticket.findFirst({
      where: { id, order: { items: { some: { sellerId: req.auth!.id } } } },
      include: { creator: true },
    });
    if (!ticket)
      throw new ApiError(404, "Order ticket not found.", "TICKET_NOT_FOUND");
    const message = await prisma.ticketMessage.create({
      data: { ticketId: id, authorId: req.auth!.id, body },
    });
    await prisma.ticket.update({ where: { id }, data: { status: "PENDING" } });
    await sendTicketUpdateEmail(
      ticket.creator.email,
      ticket.ticketNumber,
      ticket.subject,
      "PENDING",
    );
    res.status(201).json({ message });
  }),
);

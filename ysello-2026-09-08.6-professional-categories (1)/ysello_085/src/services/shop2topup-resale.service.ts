import { ProductStatus, ProductType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import { ensureOfficialSellerProfile } from "./dark-shopping-resale.service.js";
import {
  type Shop2TopupBigCategory,
  type Shop2TopupCategory,
  type Shop2TopupRequirement,
  type Shop2TopupSubcategory,
} from "./shop2topup.client.js";
import { shop2TopupClient } from "./shop2topup.service.js";

const SHOP2TOPUP_CATEGORY_TAG = "supplier:shop2topup";
const SHOP2TOPUP_BIG_CATEGORY_PREFIX = "supplier:shop2topup:big-category:";
const SHOP2TOPUP_CATEGORY_PREFIX = "supplier:shop2topup:category:";
const SHOP2TOPUP_SKU_PREFIX = "S2T-";
const CNY_PER_USD = 7.24;
const RUB_PER_USD = 91.5;

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "game-topup"
  );
}

async function uniqueCategorySlug(baseValue: string, suffixSeed: number) {
  const base = slugBase(baseValue);
  let slug = base;
  let suffix = 2;
  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 88)}-${suffixSeed}-${suffix++}`;
  }
  return slug;
}

async function uniqueProductSlug(name: string, itemId: number) {
  const base = `${slugBase(name)}-s2t-${itemId}`.slice(0, 150);
  let slug = base;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 144)}-${suffix++}`;
  }
  return slug;
}

function supplierRetailPrices(priceUsd: string | number) {
  const supplier = Number(priceUsd);
  if (!Number.isFinite(supplier) || supplier <= 0) {
    throw new ApiError(
      422,
      "SHOP2TOPUP returned an invalid supplier price.",
      "SHOP2TOPUP_PRICE_INVALID",
    );
  }
  const supplierUsdCents = Math.max(1, Math.round(supplier * 100));
  const retailUsdCents = Math.max(
    1,
    Math.ceil((supplierUsdCents * (100 + env.SHOP2TOPUP_MARGIN_PERCENT)) / 100),
  );
  return {
    supplierUsdCents,
    retailUsdCents,
    retailCnyCents: Math.ceil(retailUsdCents * CNY_PER_USD),
    retailRubCents: Math.ceil(retailUsdCents * RUB_PER_USD),
  };
}

function safeRemoteImage(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function remoteCatalogSnapshot() {
  const client = shop2TopupClient();
  const [bigCategories, categories] = await Promise.all([
    client.listBigCategories(true),
    client.listCategories(undefined, true),
  ]);
  return { bigCategories, categories };
}

function remoteBigCategory(
  bigCategories: Shop2TopupBigCategory[],
  category: Shop2TopupCategory,
) {
  return bigCategories.find((item) => item.id === category.big_category_id) ?? {
    id: category.big_category_id,
    name: category.big_category_name || "Game Top-Ups",
    description: "Game top-ups, vouchers and digital credit.",
  };
}

async function upsertBigCategory(remote: Shop2TopupBigCategory) {
  const tag = `${SHOP2TOPUP_BIG_CATEGORY_PREFIX}${remote.id}`;
  const existingByTag = await prisma.category.findFirst({
    where: { metaKeywords: { has: tag } },
  });
  const name = cleanText(remote.name, `Game Top-Ups ${remote.id}`).slice(0, 100);
  const description = cleanText(
    remote.description,
    `Browse ${name} top-ups, vouchers and digital credit on Ysello.`,
  ).slice(0, 1_000);
  if (existingByTag) {
    return prisma.category.update({
      where: { id: existingByTag.id },
      data: {
        name,
        description,
        isActive: true,
        imageUrl: safeRemoteImage(remote.image_url ?? remote.image),
        metaKeywords: [...new Set([...existingByTag.metaKeywords, SHOP2TOPUP_CATEGORY_TAG, tag])],
      },
    });
  }

  const preferred = `${slugBase(name)}-topups`;
  const existingBySlug = await prisma.category.findUnique({ where: { slug: preferred } });
  if (existingBySlug) {
    return prisma.category.update({
      where: { id: existingBySlug.id },
      data: {
        isActive: true,
        metaKeywords: [...new Set([...existingBySlug.metaKeywords, SHOP2TOPUP_CATEGORY_TAG, tag])],
      },
    });
  }

  const slug = await uniqueCategorySlug(preferred, remote.id);
  return prisma.category.create({
    data: {
      name,
      slug,
      description,
      seoTitle: `Buy ${name} Top-Ups & Vouchers | Ysello`.slice(0, 70),
      seoDescription: `Browse ${name} top-ups and vouchers with clear pricing and protected checkout on Ysello.`.slice(0, 170),
      imageUrl: safeRemoteImage(remote.image_url ?? remote.image),
      metaKeywords: [SHOP2TOPUP_CATEGORY_TAG, tag, "game top ups", "digital vouchers"],
      isActive: true,
      sortOrder: 350,
    },
  });
}

export async function importShop2TopupCategory(remoteCategoryId: number) {
  const tag = `${SHOP2TOPUP_CATEGORY_PREFIX}${remoteCategoryId}`;
  const existingByTag = await prisma.category.findFirst({
    where: { metaKeywords: { has: tag } },
  });
  if (existingByTag) {
    const reactivated = !existingByTag.isActive;
    const category = reactivated
      ? await prisma.category.update({ where: { id: existingByTag.id }, data: { isActive: true } })
      : existingByTag;
    return { category, imported: false, reactivated };
  }

  const { bigCategories, categories } = await remoteCatalogSnapshot();
  const remote = categories.find((category) => category.id === remoteCategoryId);
  if (!remote) {
    throw new ApiError(404, "SHOP2TOPUP category was not found.", "SHOP2TOPUP_CATEGORY_NOT_FOUND");
  }
  const big = remoteBigCategory(bigCategories, remote);
  const parent = await upsertBigCategory(big);
  const name = cleanText(remote.name, `Game ${remote.id}`).slice(0, 100);
  const description = cleanText(
    remote.description,
    `Buy ${name} top-ups and vouchers through Ysello.`,
  ).slice(0, 1_000);

  const preferred = `${slugBase(name)}-topups`;
  const existingBySlug = await prisma.category.findUnique({ where: { slug: preferred } });
  if (existingBySlug) {
    const category = await prisma.category.update({
      where: { id: existingBySlug.id },
      data: {
        parentId: parent.id,
        description: existingBySlug.description || description,
        imageUrl: existingBySlug.imageUrl || safeRemoteImage(remote.image_url ?? remote.image),
        isActive: true,
        metaKeywords: [...new Set([...existingBySlug.metaKeywords, SHOP2TOPUP_CATEGORY_TAG, tag])],
      },
    });
    return { category, imported: false, reactivated: !existingBySlug.isActive };
  }

  const slug = await uniqueCategorySlug(preferred, remote.id);
  const category = await prisma.category.create({
    data: {
      parentId: parent.id,
      name,
      slug,
      description,
      seoTitle: `Buy ${name} Top-Ups & Digital Credit | Ysello`.slice(0, 70),
      seoDescription: `Compare ${name} top-ups and digital credit on Ysello with clear pricing and protected checkout.`.slice(0, 170),
      imageUrl: safeRemoteImage(remote.image_url ?? remote.image),
      metaKeywords: [SHOP2TOPUP_CATEGORY_TAG, tag, name.toLowerCase(), "game top up"],
      isActive: true,
      sortOrder: 360,
    },
  });
  return { category, imported: true, reactivated: false };
}

function productArtworkUrl(remoteCategory: Shop2TopupCategory) {
  // Known platforms/games are rendered by the frontend as premium official-color icon cards.
  // For unrecognized games, keep the supplier-provided UI image as a clean fallback.
  return safeRemoteImage(remoteCategory.image_url ?? remoteCategory.image);
}

function topupProductData(
  item: Shop2TopupSubcategory,
  remoteCategory: Shop2TopupCategory,
  requirements: Shop2TopupRequirement[],
) {
  const name = cleanText(item.name, `Top-up ${item.item_id}`).slice(0, 160);
  const description = cleanText(
    item.description,
    `${name} digital top-up. Player or account information may be required before fulfillment.`,
  );
  const shortDescription = description.slice(0, 240);
  const prices = supplierRetailPrices(item.price);
  return {
    name,
    shortDescription,
    description: `${description}\n\nOrder requirements are supplied by the game or service and are validated before supplier fulfillment.`.slice(0, 20_000),
    type: ProductType.SERVICE,
    priceCents: prices.retailUsdCents,
    priceUsdCents: prices.retailUsdCents,
    priceCnyCents: prices.retailCnyCents,
    priceRubCents: prices.retailRubCents,
    currency: "USD",
    coverImageUrl: productArtworkUrl(remoteCategory),
    deliveryNote: "Digital top-up fulfillment requires the game/account fields shown for this product.",
    brand: remoteCategory.name,
    platform: remoteCategory.name,
    productKind: item.returns_voucher ? "Digital voucher" : "Game top-up",
    deliveryMethod: "SHOP2TOPUP API",
    stockType: "Supplier live catalog",
    stockQuantity: 0,
    minimumOrder: 1,
    maximumOrder: 20,
    sku: `${SHOP2TOPUP_SKU_PREFIX}${item.item_id}`,
    tags: [remoteCategory.name, item.category_name, item.returns_voucher ? "voucher" : "top-up", "shop2topup"]
      .filter(Boolean)
      .map((value) => String(value).slice(0, 100))
      .slice(0, 20),
    instantDelivery: false,
    manualDelivery: true,
    digitalDownload: false,
    isOfficial: true,
    officialStoreName: "Ysello Official",
    seoTitle: `Buy ${name} | Ysello`.slice(0, 70),
    seoDescription: shortDescription.slice(0, 160),
    productAttributes: {
      supplierFulfilled: true,
      supplier: "shop2topup",
      supplierRemoteItemId: item.item_id,
      supplierRemoteCategoryId: item.category_id,
      supplierCategory: remoteCategory.name,
      supplierBigCategoryId: remoteCategory.big_category_id,
      supplierBigCategory: remoteCategory.big_category_name,
      supplierPriceUsdCents: prices.supplierUsdCents,
      supplierMarginPercent: env.SHOP2TOPUP_MARGIN_PERCENT,
      supplierFulfillmentType: item.fulfillment_type ?? null,
      supplierReturnsVoucher: Boolean(item.returns_voucher),
      supplierRequirements: requirements,
      supplierCheckoutReady: false,
      supplierPublishBlockedReason:
        "Dynamic player/account fields must be collected at checkout before this supplier item can be published safely.",
    },
  };
}

export async function importShop2TopupProducts(input: {
  adminId: string;
  remoteCategoryId: number;
  remoteItemIds: number[];
  categoryId?: string;
  autoCategory?: boolean;
}) {
  const target = input.categoryId
    ? await prisma.category.findFirst({ where: { id: input.categoryId, isActive: true } })
    : null;
  if (!input.autoCategory && !target) {
    throw new ApiError(404, "Choose an active Ysello category.", "CATEGORY_NOT_FOUND");
  }

  await ensureOfficialSellerProfile(input.adminId);
  const client = shop2TopupClient();
  const [remoteCategories, remoteItems, requirements] = await Promise.all([
    client.listCategories(undefined, true),
    client.listSubcategories(input.remoteCategoryId),
    client.getRequirements(input.remoteCategoryId).catch(() => []),
  ]);
  const remoteCategory = remoteCategories.find((category) => category.id === input.remoteCategoryId);
  if (!remoteCategory) {
    throw new ApiError(404, "SHOP2TOPUP category was not found.", "SHOP2TOPUP_CATEGORY_NOT_FOUND");
  }

  let destinationId = target?.id;
  if (input.autoCategory) {
    destinationId = (await importShop2TopupCategory(input.remoteCategoryId)).category.id;
  }
  if (!destinationId) {
    throw new ApiError(404, "No destination category is available.", "CATEGORY_NOT_FOUND");
  }

  const byId = new Map(remoteItems.map((item) => [item.item_id, item]));
  const imported: Array<{ remoteItemId: number; productId: string; name: string; updated: boolean }> = [];
  const skipped: Array<{ remoteItemId: number; reason: string }> = [];

  for (const remoteItemId of [...new Set(input.remoteItemIds)]) {
    const item = byId.get(remoteItemId);
    if (!item) {
      skipped.push({ remoteItemId, reason: "Supplier item was not found in the selected category." });
      continue;
    }
    try {
      const data = topupProductData(item, remoteCategory, requirements);
      const existing = await prisma.product.findFirst({
        where: { sku: `${SHOP2TOPUP_SKU_PREFIX}${remoteItemId}` },
        select: { id: true, slug: true },
      });
      if (existing) {
        const product = await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...data,
            categoryId: destinationId,
            status: ProductStatus.DRAFT,
            publishedAt: null,
          },
        });
        imported.push({ remoteItemId, productId: product.id, name: product.name, updated: true });
        continue;
      }
      const slug = await uniqueProductSlug(data.name, remoteItemId);
      const product = await prisma.product.create({
        data: {
          ...data,
          sellerId: input.adminId,
          categoryId: destinationId,
          slug,
          status: ProductStatus.DRAFT,
          publishedAt: null,
        },
      });
      imported.push({ remoteItemId, productId: product.id, name: product.name, updated: false });
    } catch (error) {
      skipped.push({
        remoteItemId,
        reason: error instanceof Error ? error.message : "Product could not be imported.",
      });
    }
  }

  return {
    imported,
    skipped,
    marginPercent: env.SHOP2TOPUP_MARGIN_PERCENT,
    publishBlocked: true,
    publishBlockedReason:
      "SHOP2TOPUP items are imported as drafts until Ysello checkout collects and validates the supplier-specific player/account requirements.",
  };
}

export async function listShop2TopupImports() {
  return prisma.product.findMany({
    where: { sku: { startsWith: SHOP2TOPUP_SKU_PREFIX } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      status: true,
      priceUsdCents: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function listShop2TopupCategoryMappings() {
  const categories = await prisma.category.findMany({
    where: { metaKeywords: { has: SHOP2TOPUP_CATEGORY_TAG } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return categories.flatMap((category) =>
    category.metaKeywords
      .filter((tag) => tag.startsWith(SHOP2TOPUP_CATEGORY_PREFIX))
      .flatMap((tag) => {
        const remoteCategoryId = Number(tag.slice(SHOP2TOPUP_CATEGORY_PREFIX.length));
        return Number.isSafeInteger(remoteCategoryId) && remoteCategoryId > 0
          ? [{ remoteCategoryId, categoryId: category.id, name: category.name, slug: category.slug, isActive: category.isActive }]
          : [];
      }),
  );
}

import {
  identifyProductPlatform,
  platformCategorySlug,
  platformImage,
  type ProductPlatform,
} from "../data/platformIdentity.js";
import { OrderStatus, ProductStatus, ProductType } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import {
  DARK_SHOPPING_GLOBAL_MARGIN_PERCENT,
  type DarkShoppingCategory,
  type DarkShoppingProduct,
} from "./dark-shopping.client.js";
import { darkShoppingClient } from "./dark-shopping.service.js";

export const DARK_SHOPPING_RUB_PER_USD = env.DARK_SHOPPING_RUB_PER_USD;
export const DARK_SHOPPING_CNY_PER_USD = 7.24;
const MAX_PROVIDER_DELIVERY_BYTES = 10 * 1024 * 1024;

export type DarkShoppingResalePrices = {
  supplierPriceRubCents: number;
  retailPriceRubCents: number;
  retailPriceUsdCents: number;
  retailPriceCnyCents: number;
  marginPercent: number;
};

export function darkShoppingResalePrices(
  supplierPriceRub: number,
): DarkShoppingResalePrices {
  const marginPercent = DARK_SHOPPING_GLOBAL_MARGIN_PERCENT;
  if (!Number.isFinite(supplierPriceRub) || supplierPriceRub <= 0) {
    throw new ApiError(
      422,
      "The supplier product does not have a valid price.",
      "DARK_SHOPPING_PRICE_INVALID",
    );
  }
  const supplierPriceRubCents = Math.round(supplierPriceRub * 100);
  const retailPriceRubCents = Math.ceil(
    (supplierPriceRubCents * (100 + marginPercent)) / 100,
  );
  const retailPriceUsdCents = Math.max(
    50,
    Math.ceil(retailPriceRubCents / DARK_SHOPPING_RUB_PER_USD),
  );
  const retailPriceCnyCents = Math.ceil(
    retailPriceUsdCents * DARK_SHOPPING_CNY_PER_USD,
  );

  return {
    supplierPriceRubCents,
    retailPriceRubCents,
    retailPriceUsdCents,
    retailPriceCnyCents,
    marginPercent,
  };
}

function decodeHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, token: string) => {
      if (token.startsWith("#x")) {
        const code = Number.parseInt(token.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      if (token.startsWith("#")) {
        const code = Number.parseInt(token.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      return entities[token.toLowerCase()] ?? entity;
    },
  );
}

export function darkShoppingPlainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:div|li|p|section)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function slugBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "digital-product"
  );
}

async function uniqueProductSlug(name: string, remoteProductId: number) {
  const base = `${slugBase(name)}-ys${remoteProductId}`.slice(0, 150);
  let slug = base;
  let suffix = 2;
  while (
    await prisma.product.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${base.slice(0, 145)}-${suffix++}`;
  }
  return slug;
}

function yselloPublicText(value: string) {
  return darkShoppingPlainText(value)
    .replace(/https?:\/\/(?:www\.)?dark\.shopping\/?\S*/gi, " ")
    .replace(/\bdark\s*\.?\s*shopping\b/gi, "Ysello")
    .replace(/\bdarkstore\b/gi, "Ysello")
    .replace(/\bsupplier(?:'s)?\b/gi, "marketplace")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

const nativeCategorySlugs: Array<[RegExp, string]> = [
  [/\binstagram\b/i, "instagram-accounts"],
  [/\bfacebook\b/i, "facebook-accounts"],
  [/\bthreads\b/i, "threads-accounts"],
  [/\btwitter\b|\bx\s*\/\s*twitter\b|^x$/i, "x-accounts"],
  [/\btiktok\b|\btik\s*tok\b/i, "tiktok-accounts"],
  [/\btelegram\b/i, "telegram-accounts"],
  [/\bdiscord\b/i, "discord-accounts"],
  [/\bsnapchat\b/i, "snapchat-accounts"],
  [/\bwhatsapp\b|\bwhats\s*app\b/i, "whatsapp-accounts"],
  [/\byoutube\b|\byou\s*tube\b/i, "youtube-accounts"],
  [/\btwitch\b/i, "streaming-accounts"],
  [/\blinkedin\b|\blinked\s*in\b/i, "linkedin-accounts"],
  [/\bpinterest\b/i, "pinterest-accounts"],
  [/\bgmail\b/i, "gmail-accounts"],
  [/\boutlook\b|\bhotmail\b/i, "outlook-accounts"],
  [/\byahoo\b/i, "yahoo-accounts"],
  [/\bproton(?:mail)?\b/i, "protonmail-accounts"],
  [/\breddit\b/i, "reddit-accounts"],
  [/\bsteam\b/i, "steam-accounts"],
  [/\bgoogle\b/i, "google-accounts"],
];

async function ensurePlatformCategory(platform: ProductPlatform) {
  const slug = platformCategorySlug(platform);
  const existing = await prisma.category.findUnique({ where: { slug } });
  const data = {
    name: platform.name,
    parentId: null,
    isActive: true,
    imageUrl: platformImage(platform),
    description: `Browse ${platform.name} accounts and digital products. Compare availability, pricing and delivery terms before checkout.`,
    metaKeywords: [
      ...new Set([
        ...(existing?.metaKeywords ?? []),
        "supplier:dark-shopping",
        `platform:${platform.slug}`,
      ]),
    ],
  };
  return prisma.category.upsert({
    where: { slug },
    create: { ...data, slug },
    update: data,
  });
}

/** Repairs local imported listings without calling the supplier or touching order/inventory records. */
export async function repairDarkShoppingCatalog() {
  const categories = new Map<string, string>();
  let cursor: string | undefined;
  let repaired = 0;
  let unclassified = 0;
  for (;;) {
    const products = await prisma.product.findMany({
      where: { darkShoppingListing: { isNot: null } },
      orderBy: { id: "asc" },
      take: 250,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        platform: true,
        productKind: true,
        categoryId: true,
        coverImageUrl: true,
        category: { select: { name: true } },
      },
    });
    if (!products.length) break;
    const updates = new Map<string, { platform: ProductPlatform; categoryId: string; ids: string[] }>();
    for (const product of products) {
      const platform = identifyProductPlatform(product.name, product.productKind, product.platform, product.category.name);
      if (!platform) { unclassified += 1; continue; }
      let categoryId = categories.get(platform.slug);
      if (!categoryId) { categoryId = (await ensurePlatformCategory(platform)).id; categories.set(platform.slug, categoryId); }
      if (product.categoryId !== categoryId || product.platform !== platform.name || product.coverImageUrl !== platformImage(platform)) {
        const group = updates.get(platform.slug) ?? { platform, categoryId, ids: [] };
        group.ids.push(product.id);
        updates.set(platform.slug, group);
      }
    }
    for (const {platform, categoryId, ids} of updates.values()) {
      const result = await prisma.product.updateMany({where: {id: {in: ids}}, data: {categoryId, platform: platform.name, coverImageUrl: platformImage(platform)}});
      repaired += result.count;
    }
    cursor = products[products.length - 1].id;
  }
  await prisma.sellerProfile.updateMany({
    where: { storeName: "Ysello Official", logoUrl: null },
    data: { logoUrl: "/ysello-mark.svg" },
  });
  await prisma.sellerProfile.updateMany({
    where: { storeName: "Ysello Official", bannerUrl: null },
    data: { bannerUrl: "/ysello-official-banner.svg" },
  });
  return { repaired, unclassified };
}

function nativeCategorySlug(name: string) {
  const platform = identifyProductPlatform(name);
  if (platform) return platformCategorySlug(platform);
  const mapped = nativeCategorySlugs.find(([pattern]) =>
    pattern.test(name),
  )?.[1];
  return mapped ?? `${slugBase(name)}-marketplace`;
}

function nativeCategoryDescription(name: string) {
  return `Browse ${name} products selected and maintained by Ysello, with live availability, clear pricing and protected marketplace checkout.`;
}

async function normalizeDarkShoppingCategory(category: {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  metaKeywords: string[];
  isActive: boolean;
}) {
  if (category.metaKeywords.some((tag) => tag.startsWith("platform:"))) return category;
  const targetSlug = nativeCategorySlug(category.name);
  const description = nativeCategoryDescription(category.name);
  const target = await prisma.category.findUnique({
    where: { slug: targetSlug },
  });

  if (target && target.id !== category.id) {
    const metaKeywords = [
      ...new Set([...target.metaKeywords, ...category.metaKeywords]),
    ];
    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId: category.id },
        data: { categoryId: target.id },
      }),
      prisma.category.updateMany({
        where: { parentId: category.id },
        data: { parentId: target.id },
      }),
      prisma.category.update({
        where: { id: target.id },
        data: {
          metaKeywords,
          isActive: true,
          description: target.description || description,
          seoTitle: target.seoTitle || `${category.name} Marketplace | Ysello`,
          seoDescription: target.seoDescription || description.slice(0, 170),
        },
      }),
      prisma.category.delete({ where: { id: category.id } }),
    ]);
    return prisma.category.findUniqueOrThrow({ where: { id: target.id } });
  }

  if (
    category.slug !== targetSlug ||
    /dark-shopping/i.test(category.description) ||
    category.imageUrl
  ) {
    return prisma.category.update({
      where: { id: category.id },
      data: {
        slug: targetSlug,
        description,
        seoTitle: `${category.name} Marketplace | Ysello`.slice(0, 70),
        seoDescription: description.slice(0, 170),
        imageUrl: null,
        isActive: true,
      },
    });
  }
  return category;
}

const DARK_SHOPPING_CATEGORY_TAG = "supplier:dark-shopping";
const DARK_SHOPPING_CATEGORY_ID_PREFIX = "supplier:dark-shopping:category:";

function darkShoppingCategoryIdTag(remoteCategoryId: number) {
  return `${DARK_SHOPPING_CATEGORY_ID_PREFIX}${remoteCategoryId}`;
}

function trustedDarkShoppingAsset(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "dark.shopping"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function fetchAllDarkShoppingCategories() {
  const items: DarkShoppingCategory[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const response = await darkShoppingClient().listCategories({
      page,
      perPage: 1_000,
    });
    items.push(...response.items);
    pageCount = Math.max(1, response._meta?.pageCount ?? 1);
    page += 1;
  } while (page <= pageCount && page <= 100);
  return items;
}

export async function listDarkShoppingCategoryMappings() {
  const existing = await prisma.category.findMany({
    where: { metaKeywords: { has: DARK_SHOPPING_CATEGORY_TAG } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const normalizedById = new Map<
    string,
    Awaited<ReturnType<typeof normalizeDarkShoppingCategory>>
  >();
  for (const category of existing) {
    const normalized = await normalizeDarkShoppingCategory(category);
    normalizedById.set(normalized.id, normalized);
  }

  return [...normalizedById.values()].flatMap((category) =>
    category.metaKeywords
      .filter((keyword) => keyword.startsWith(DARK_SHOPPING_CATEGORY_ID_PREFIX))
      .flatMap((tag) => {
        const remoteCategoryId = Number(
          tag.slice(DARK_SHOPPING_CATEGORY_ID_PREFIX.length),
        );
        if (!Number.isSafeInteger(remoteCategoryId) || remoteCategoryId <= 0) {
          return [];
        }
        return [
          {
            remoteCategoryId,
            categoryId: category.id,
            name: category.name,
            slug: category.slug,
            isActive: category.isActive,
          },
        ];
      }),
  );
}

export async function importDarkShoppingCategory(remoteCategoryId: number) {
  const tag = darkShoppingCategoryIdTag(remoteCategoryId);
  const existing = await prisma.category.findFirst({
    where: { metaKeywords: { has: tag } },
  });
  if (existing) {
    const category = await normalizeDarkShoppingCategory(existing);
    const reactivated = !category.isActive;
    if (!category.isActive) {
      await prisma.category.update({
        where: { id: category.id },
        data: { isActive: true },
      });
    }
    return {
      category: { ...category, isActive: true },
      imported: false,
      reactivated,
    };
  }

  const remote = (await fetchAllDarkShoppingCategories()).find(
    (category) => category.id === remoteCategoryId,
  );
  if (!remote) {
    throw new ApiError(
      404,
      "Dark Shopping category was not found.",
      "DARK_SHOPPING_CATEGORY_NOT_FOUND",
    );
  }

  const name =
    yselloPublicText(remote.name).slice(0, 100) || `Marketplace ${remote.id}`;
  const targetSlug = nativeCategorySlug(name);
  const description = nativeCategoryDescription(name);
  const target = await prisma.category.findUnique({
    where: { slug: targetSlug },
  });
  if (target) {
    const category = await prisma.category.update({
      where: { id: target.id },
      data: {
        metaKeywords: [
          ...new Set([
            ...target.metaKeywords,
            DARK_SHOPPING_CATEGORY_TAG,
            tag,
            name.toLowerCase(),
          ]),
        ],
        isActive: true,
        description: target.description || description,
        seoTitle:
          target.seoTitle || `${name} Marketplace | Ysello`.slice(0, 70),
        seoDescription: target.seoDescription || description.slice(0, 170),
      },
    });
    return { category, imported: false, reactivated: !target.isActive };
  }

  let slug = targetSlug;
  let suffix = 2;
  while (
    await prisma.category.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${targetSlug.slice(0, 94)}-${suffix++}`;
  }
  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description,
      seoTitle: `${name} Marketplace | Ysello`.slice(0, 70),
      seoDescription: description.slice(0, 170),
      imageUrl: null,
      metaKeywords: [DARK_SHOPPING_CATEGORY_TAG, tag, name.toLowerCase()],
      isActive: true,
    },
  });
  return { category, imported: true, reactivated: false };
}

export async function ensureOfficialSellerProfile(userId: string) {
  const existing = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (existing) {
    if (
      existing.storeName !== "Ysello Official" ||
      !existing.isVerified ||
      existing.isSuspended
    ) {
      return prisma.sellerProfile.update({
        where: { userId },
        data: {
          storeName: "Ysello Official",
          about:
            "Official marketplace catalog managed by the Ysello administration team.",
          policy:
            "Products are reviewed and supported through the marketplace order system.",
          isVerified: true,
          isSuspended: false,
          suspensionReason: null,
        },
      });
    }
    return existing;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  const base = slugBase(`${user?.username ?? "ysello"}-official`);
  let slug = base;
  let suffix = 2;
  while (
    await prisma.sellerProfile.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }

  return prisma.sellerProfile.create({
    data: {
      userId,
      storeName: "Ysello Official",
      logoUrl: "/ysello-mark.svg",
      bannerUrl: "/ysello-official-banner.svg",
      slug,
      about:
        "Official marketplace catalog managed by the Ysello administration team.",
      policy:
        "Products are reviewed and supported through the marketplace order system.",
      isVerified: true,
    },
  });
}

function remoteProductData(product: DarkShoppingProduct) {
  const marginPercent = DARK_SHOPPING_GLOBAL_MARGIN_PERCENT;
  if (
    product.is_manual_order_delivery === true ||
    product.is_manual_order_delivery === 1
  ) {
    throw new ApiError(
      422,
      `${product.name} uses manual supplier delivery and cannot be automatically resold.`,
      "DARK_SHOPPING_MANUAL_DELIVERY_UNSUPPORTED",
    );
  }
  if (product.minimum_order > 20) {
    throw new ApiError(
      422,
      `${product.name} requires a minimum quantity above Ysello's checkout limit of 20.`,
      "DARK_SHOPPING_MINIMUM_UNSUPPORTED",
    );
  }
  if (!product.category || product.category.id <= 0) {
    throw new ApiError(
      422,
      `${product.name} does not include a valid supplier category and cannot be imported safely.`,
      "DARK_SHOPPING_CATEGORY_INVALID",
    );
  }

  const identity = identifyProductPlatform(
    product.name,
    product.group?.name,
    product.category?.name,
  );
  const prices = darkShoppingResalePrices(product.price);
  const name = yselloPublicText(product.name).slice(0, 160);
  const remoteDescription = yselloPublicText(product.description);
  const manual = yselloPublicText(product.manual || "");
  const replacementTerms = yselloPublicText(
    product.replacement_terms_public || "",
  );
  const description = [
    remoteDescription || `${name} digital product.`,
    manual ? `Usage information\n${manual}` : "",
    replacementTerms ? `Replacement terms\n${replacementTerms}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 20_000);
  const shortDescription = (
    remoteDescription || `${name} with protected digital delivery.`
  )
    .replace(/\s+/g, " ")
    .slice(0, 240);
  const remoteQuantity = Math.max(0, Math.trunc(product.quantity || 0));
  const minimumOrder = Math.max(1, Math.trunc(product.minimum_order || 1));
  const availableQuantity = remoteQuantity >= minimumOrder ? remoteQuantity : 0;
  const guaranteeHours = product.guarantee_time_seconds
    ? Math.ceil(product.guarantee_time_seconds / 3600)
    : 12;

  return {
    prices,
    product: {
      name: name || `Supplier product ${product.id}`,
      shortDescription,
      description,
      type: ProductType.DOWNLOAD,
      priceCents: prices.retailPriceUsdCents,
      priceUsdCents: prices.retailPriceUsdCents,
      priceCnyCents: prices.retailPriceCnyCents,
      priceRubCents: prices.retailPriceRubCents,
      currency: "USD",
      coverImageUrl: identity ? platformImage(identity) : null,
      deliveryNote:
        "Secure digital delivery is prepared automatically after payment confirmation.",
      platform:
        identity?.name ||
        yselloPublicText(product.category?.name ?? "").slice(0, 100) ||
        null,
      productKind:
        yselloPublicText(product.group?.name ?? "").slice(0, 100) ||
        "Digital product",
      stockType: "Live inventory",
      warranty: product.guarantee_time_seconds
        ? `${guaranteeHours} hour replacement guarantee`
        : null,
      refundPolicy: replacementTerms || null,
      stockQuantity: availableQuantity,
      minimumOrder,
      maximumOrder: Math.max(
        minimumOrder,
        Math.min(20, availableQuantity || minimumOrder),
      ),
      sku: `YS-${product.id}`,
      tags: ["ysello-live", product.category?.name, product.group?.name]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.slice(0, 100))
        .slice(0, 20),
      instantDelivery: true,
      manualDelivery: false,
      digitalDownload: true,
      afterSalesServiceHours: Math.max(12, Math.min(8760, guaranteeHours)),
      seoTitle: name.slice(0, 70) || null,
      seoDescription: shortDescription.slice(0, 160),
      productAttributes: {
        supplierFulfilled: true,
        supplier: "dark.shopping",
        supplierCategory: product.category?.name ?? null,
        supplierGroup: product.group?.name ?? null,
        supplierQualityPercent: product.quality_percent ?? null,
        supplierInvalidItemsPercent: product.invalid_items_percent ?? null,
        supplierPurchaseCounter: product.purchase_counter ?? 0,
        supplierViews: product.view ?? 0,
        supplierGuaranteeSeconds: product.guarantee_time_seconds ?? null,
        supplierRemoteProductId: product.id,
      },
    },
    listing: {
      remoteProductId: product.id,
      remoteCategoryId: product.category.id,
      remoteGroupId: product.group?.id ?? null,
      supplierPriceRubCents: prices.supplierPriceRubCents,
      marginPercent,
      remoteQuantity,
      remoteMinimumOrder: minimumOrder,
      isManualDelivery: false,
      remoteUrl: trustedDarkShoppingAsset(product.url),
      isEnabled: true,
      lastSyncedAt: new Date(),
      lastError: null,
    },
  };
}

export async function importDarkShoppingProducts(input: {
  adminId: string;
  remoteProductIds: number[];
  categoryId?: string;
  autoCategory?: boolean;
  publish: boolean;
}) {
  const category = input.categoryId
    ? await prisma.category.findFirst({
        where: { id: input.categoryId, isActive: true },
        select: { id: true },
      })
    : null;
  if (!input.autoCategory && !category) {
    throw new ApiError(
      404,
      "Choose an active Ysello category.",
      "CATEGORY_NOT_FOUND",
    );
  }
  await ensureOfficialSellerProfile(input.adminId);
  const marginPercent = DARK_SHOPPING_GLOBAL_MARGIN_PERCENT;
  // The supplier client imports in small product/list batches and falls back to
  // product/view only when a batch cannot be retrieved. The shared 700ms queue
  // plus 429 backoff keeps imports below Dark.shopping's published 2 req/s cap.
  const viewed = await darkShoppingClient().viewProducts(
    input.remoteProductIds,
  );
  const remoteById = new Map(
    viewed.items.map((product) => [product.id, product]),
  );
  const imported: Array<{
    remoteProductId: number;
    productId: string;
    name: string;
  }> = [];
  const skipped: Array<{ remoteProductId: number; reason: string }> = [];

  const mappedCategories = new Map<number, string>();
  for (const remoteProductId of input.remoteProductIds) {
    const remote = remoteById.get(remoteProductId);
    if (!remote) {
      skipped.push({
        remoteProductId,
        reason: "Supplier product was not found.",
      });
      continue;
    }
    try {
      const data = remoteProductData(remote);
      let categoryId = category?.id;
      if (input.autoCategory) {
        const identity = identifyProductPlatform(
          remote.name,
          remote.group?.name,
          remote.category?.name,
        );
        if (identity) {
          categoryId = (await ensurePlatformCategory(identity)).id;
        } else {
          categoryId = mappedCategories.get(remote.category.id);
          if (!categoryId) {
            categoryId = (await importDarkShoppingCategory(remote.category.id))
              .category.id;
            mappedCategories.set(remote.category.id, categoryId);
          }
        }
      }
      if (!categoryId)
        throw new Error(
          "No destination category is available for this product.",
        );
      const existing = await prisma.darkShoppingListing.findUnique({
        where: { remoteProductId },
        select: {
          id: true,
          productId: true,
          isEnabled: true,
          product: { select: { status: true, publishedAt: true } },
        },
      });
      if (existing) {
        const product = await prisma.$transaction(async (tx) => {
          const updated = await tx.product.update({
            where: { id: existing.productId },
            data: {
              ...data.product,
              categoryId,
              status: input.publish
                ? ProductStatus.APPROVED
                : existing.product.status,
              publishedAt: input.publish
                ? new Date()
                : existing.product.publishedAt,
              isOfficial: true,
              officialStoreName: "Ysello Official",
            },
          });
          await tx.darkShoppingListing.update({
            where: { id: existing.id },
            data: {
              ...data.listing,
              isEnabled: input.publish ? true : existing.isEnabled,
            },
          });
          return updated;
        });
        imported.push({
          remoteProductId,
          productId: product.id,
          name: product.name,
        });
        continue;
      }

      const slug = await uniqueProductSlug(data.product.name, remoteProductId);
      const product = await prisma.product.create({
        data: {
          ...data.product,
          sellerId: input.adminId,
          categoryId,
          slug,
          status: input.publish ? ProductStatus.APPROVED : ProductStatus.DRAFT,
          publishedAt: input.publish ? new Date() : null,
          isOfficial: true,
          officialStoreName: "Ysello Official",
          darkShoppingListing: {
            create: { ...data.listing, isEnabled: input.publish },
          },
        },
      });
      imported.push({
        remoteProductId,
        productId: product.id,
        name: product.name,
      });
    } catch (error) {
      skipped.push({
        remoteProductId,
        reason:
          error instanceof Error
            ? error.message
            : "Product could not be imported.",
      });
    }
  }

  return { imported, skipped, marginPercent };
}

async function syncListingRecords(
  listings: Array<{
    id: string;
    productId: string;
    remoteProductId: number;
  }>,
) {
  if (!listings.length) return { synced: 0, unavailable: 0 };
  let synced = 0;
  let unavailable = 0;

  for (let offset = 0; offset < listings.length; offset += 20) {
    const chunk = listings.slice(offset, offset + 20);
    const response = await darkShoppingClient().listProducts({
      ids: chunk.map((listing) => listing.remoteProductId),
      perPage: 20,
    });
    const remoteById = new Map(
      response.items.map((product) => [product.id, product]),
    );
    for (const listing of chunk) {
      const remote = remoteById.get(listing.remoteProductId);
      if (!remote) {
        unavailable += 1;
        await prisma.$transaction([
          prisma.darkShoppingListing.update({
            where: { id: listing.id },
            data: {
              remoteQuantity: 0,
              lastSyncedAt: new Date(),
              lastError: "Supplier product is unavailable.",
            },
          }),
          prisma.product.update({
            where: { id: listing.productId },
            data: { stockQuantity: 0 },
          }),
        ]);
        continue;
      }
      try {
        const data = remoteProductData(remote);
        const { isEnabled: _isEnabled, ...syncedListing } = data.listing;
        await prisma.$transaction([
          prisma.darkShoppingListing.update({
            where: { id: listing.id },
            data: syncedListing,
          }),
          prisma.product.update({
            where: { id: listing.productId },
            data: data.product,
          }),
        ]);
        synced += 1;
      } catch (error) {
        unavailable += 1;
        await prisma.$transaction([
          prisma.darkShoppingListing.update({
            where: { id: listing.id },
            data: {
              remoteQuantity: 0,
              lastSyncedAt: new Date(),
              lastError:
                error instanceof Error
                  ? error.message
                  : "Synchronization failed.",
            },
          }),
          prisma.product.update({
            where: { id: listing.productId },
            data: { stockQuantity: 0 },
          }),
        ]);
      }
    }
  }
  return { synced, unavailable };
}

export async function syncDarkShoppingListings(listingId?: string) {
  const listings = await prisma.darkShoppingListing.findMany({
    where: listingId ? { id: listingId } : { isEnabled: true },
    select: {
      id: true,
      productId: true,
      remoteProductId: true,
    },
  });
  if (listingId && !listings.length) {
    throw new ApiError(
      404,
      "Supplier listing not found.",
      "SUPPLIER_LISTING_NOT_FOUND",
    );
  }
  return syncListingRecords(listings);
}

export async function refreshDarkShoppingProductsForCheckout(
  productIds: string[],
) {
  const listings = await prisma.darkShoppingListing.findMany({
    where: { productId: { in: productIds }, isEnabled: true },
    select: {
      id: true,
      productId: true,
      remoteProductId: true,
    },
  });
  await syncListingRecords(listings);
}

export async function assertDarkShoppingBalance(requiredRubCents: number) {
  if (requiredRubCents <= 0) return;
  const balance = await darkShoppingClient().getBalance();
  if (balance.currency.toUpperCase() !== "RUB") {
    throw new ApiError(
      503,
      `Dark Shopping returned an unsupported balance currency: ${balance.currency}.`,
      "DARK_SHOPPING_BALANCE_CURRENCY_UNSUPPORTED",
    );
  }
  const availableRubCents = Math.floor(balance.balance * 100);
  if (availableRubCents < requiredRubCents) {
    throw new ApiError(
      409,
      "This supplier product is temporarily unavailable because the supplier account balance is too low. Please try again later.",
      "DARK_SHOPPING_BALANCE_INSUFFICIENT",
    );
  }
}

export function listDarkShoppingListings() {
  return prisma.darkShoppingListing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          categoryId: true,
          priceUsdCents: true,
          priceRubCents: true,
          stockQuantity: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
}

export async function updateDarkShoppingListing(
  id: string,
  input: { isEnabled?: boolean },
) {
  const listing = await prisma.darkShoppingListing.findUnique({
    where: { id },
  });
  if (!listing) {
    throw new ApiError(
      404,
      "Supplier listing not found.",
      "SUPPLIER_LISTING_NOT_FOUND",
    );
  }
  const enabled = input.isEnabled ?? listing.isEnabled;
  const productUpdate =
    input.isEnabled === undefined
      ? {}
      : {
          status: enabled ? ProductStatus.APPROVED : ProductStatus.HIDDEN,
          publishedAt: enabled ? new Date() : null,
          stockQuantity: enabled ? undefined : 0,
        };
  await prisma.$transaction([
    prisma.darkShoppingListing.update({
      where: { id },
      data: {
        isEnabled: enabled,
        marginPercent: DARK_SHOPPING_GLOBAL_MARGIN_PERCENT,
      },
    }),
    prisma.product.update({
      where: { id: listing.productId },
      data: productUpdate,
    }),
  ]);
  if (enabled) {
    await syncDarkShoppingListings(id);
  }
  return prisma.darkShoppingListing.findUnique({
    where: { id },
    include: { product: { include: { category: true } } },
  });
}

function safeFulfillmentError(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 1_000)
    : "Supplier fulfillment failed.";
}

async function deliverFulfillment(
  fulfillment: {
    id: string;
    orderItemId: string;
    quantity: number;
    listing: { id: string; productId: string };
  },
  remoteOrderId: number,
  deliveryUrl: string,
) {
  const file = await darkShoppingClient().downloadDeliveryFile(
    deliveryUrl,
    MAX_PROVIDER_DELIVERY_BYTES,
  );
  const text = file
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!text) {
    throw new ApiError(
      502,
      "The supplier returned an empty delivery file.",
      "DARK_SHOPPING_EMPTY_DELIVERY",
    );
  }
  const rows = text.split(/\r?\n/).filter((line) => line.length > 0);
  const deliveredAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.productInventoryItem.deleteMany({
      where: { orderItemId: fulfillment.orderItemId, source: "DARK_SHOPPING" },
    });
    await tx.productInventoryItem.createMany({
      data: rows.map((content) => ({
        productId: fulfillment.listing.productId,
        orderItemId: fulfillment.orderItemId,
        content,
        source: "DARK_SHOPPING",
        isActive: true,
        deliveredAt,
      })),
    });
    await tx.orderItem.update({
      where: { id: fulfillment.orderItemId },
      data: {
        deliveredAt,
        deliveryMessage:
          "Delivered automatically through Ysello verified inventory.",
      },
    });
    await tx.darkShoppingFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        remoteOrderId,
        status: "FULFILLED",
        deliveryUrl,
        lastError: null,
        lastCheckedAt: deliveredAt,
        fulfilledAt: deliveredAt,
      },
    });
    const localProduct = await tx.product.findUniqueOrThrow({
      where: { id: fulfillment.listing.productId },
      select: { stockQuantity: true },
    });
    await tx.product.update({
      where: { id: fulfillment.listing.productId },
      data: {
        stockQuantity: Math.max(
          0,
          localProduct.stockQuantity - fulfillment.quantity,
        ),
      },
    });
    const localListing = await tx.darkShoppingListing.findUniqueOrThrow({
      where: { id: fulfillment.listing.id },
      select: { remoteQuantity: true },
    });
    await tx.darkShoppingListing.update({
      where: { id: fulfillment.listing.id },
      data: {
        remoteQuantity: Math.max(
          0,
          localListing.remoteQuantity - fulfillment.quantity,
        ),
      },
    });

    const orderItem = await tx.orderItem.findUniqueOrThrow({
      where: { id: fulfillment.orderItemId },
      select: { orderId: true },
    });
    const remaining = await tx.orderItem.count({
      where: { orderId: orderItem.orderId, deliveredAt: null },
    });
    if (remaining === 0) {
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          completedAt: deliveredAt,
        },
      });
    }
  });
}

export async function processDarkShoppingFulfillment(id: string) {
  const staleProcessing = new Date(Date.now() - 2 * 60 * 1_000);
  const claimed = await prisma.darkShoppingFulfillment.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["PENDING", "IN_PROCESS"] } },
        { status: "PROCESSING", updatedAt: { lt: staleProcessing } },
      ],
    },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return null;

  const fulfillment = await prisma.darkShoppingFulfillment.findUniqueOrThrow({
    where: { id },
    include: {
      listing: { select: { id: true, productId: true, remoteProductId: true } },
      orderItem: { select: { quantity: true, unitPriceCents: true } },
    },
  });

  try {
    let remoteOrderId = fulfillment.remoteOrderId;
    let deliveryUrl: string | undefined;
    if (!remoteOrderId) {
      const currentProduct = await darkShoppingClient().viewProduct(
        fulfillment.listing.remoteProductId,
      );
      const currentPrices = darkShoppingResalePrices(currentProduct.price);
      const chargedRubCents = Math.floor(
        fulfillment.orderItem.unitPriceCents * DARK_SHOPPING_RUB_PER_USD,
      );
      if (
        currentProduct.is_manual_order_delivery === true ||
        currentProduct.is_manual_order_delivery === 1 ||
        currentProduct.quantity < fulfillment.quantity ||
        currentProduct.minimum_order > fulfillment.quantity
      ) {
        throw new ApiError(
          409,
          "Supplier stock or delivery requirements changed after checkout. Review and refund this order.",
          "DARK_SHOPPING_FULFILLMENT_UNAVAILABLE",
        );
      }
      if (chargedRubCents < currentPrices.retailPriceRubCents) {
        await prisma.$transaction([
          prisma.darkShoppingListing.update({
            where: { id: fulfillment.listing.id },
            data: {
              supplierPriceRubCents: currentPrices.supplierPriceRubCents,
              remoteQuantity: currentProduct.quantity,
              lastSyncedAt: new Date(),
              lastError:
                "Supplier price increased after buyer checkout; fulfillment requires review.",
            },
          }),
          prisma.product.update({
            where: { id: fulfillment.listing.productId },
            data: { stockQuantity: 0 },
          }),
        ]);
        throw new ApiError(
          409,
          "Supplier price increased after checkout and would reduce the configured margin. Automatic purchase was stopped; review and refund this order.",
          "DARK_SHOPPING_MARGIN_PROTECTED",
        );
      }
      await prisma.darkShoppingFulfillment.update({
        where: { id },
        data: {
          supplierUnitPriceRubCents: currentPrices.supplierPriceRubCents,
        },
      });
      await assertDarkShoppingBalance(
        currentPrices.supplierPriceRubCents * fulfillment.quantity,
      );
      const created = await darkShoppingClient().createOrder({
        productId: fulfillment.listing.remoteProductId,
        quantity: fulfillment.quantity,
        idempotenceId: fulfillment.idempotenceId,
        sendEmailCopy: false,
      });
      remoteOrderId = created.id;
      deliveryUrl = created.link;
      await prisma.darkShoppingFulfillment.update({
        where: { id },
        data: {
          remoteOrderId,
          deliveryUrl: deliveryUrl ?? null,
          status: deliveryUrl ? "PROCESSING" : "IN_PROCESS",
          lastCheckedAt: new Date(),
        },
      });
    }

    if (!deliveryUrl) {
      const status = await darkShoppingClient().getOrderStatus(remoteOrderId);
      if (status.status === "completed") {
        deliveryUrl = (await darkShoppingClient().downloadOrder(remoteOrderId))
          .link;
      } else if (status.status === "in_process" || status.status === "unpaid") {
        await prisma.darkShoppingFulfillment.update({
          where: { id },
          data: {
            status: "IN_PROCESS",
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });
        return { id, status: "IN_PROCESS", remoteOrderId };
      } else {
        throw new ApiError(
          502,
          `Supplier order ended with status ${status.status}.`,
          "DARK_SHOPPING_ORDER_FAILED",
        );
      }
    }

    await deliverFulfillment(
      {
        id,
        orderItemId: fulfillment.orderItemId,
        quantity: fulfillment.quantity,
        listing: fulfillment.listing,
      },
      remoteOrderId,
      deliveryUrl,
    );
    return { id, status: "FULFILLED", remoteOrderId };
  } catch (error) {
    const latest = await prisma.darkShoppingFulfillment.findUnique({
      where: { id },
      select: { attempts: true, remoteOrderId: true },
    });
    await prisma.darkShoppingFulfillment.update({
      where: { id },
      data: {
        status:
          error instanceof ApiError &&
          [
            "DARK_SHOPPING_MARGIN_PROTECTED",
            "DARK_SHOPPING_FULFILLMENT_UNAVAILABLE",
            "DARK_SHOPPING_BALANCE_INSUFFICIENT",
            "DARK_SHOPPING_BALANCE_CURRENCY_UNSUPPORTED",
            "DARK_SHOPPING_ORDER_FAILED",
            "DARK_SHOPPING_DELIVERY_URL_INVALID",
            "DARK_SHOPPING_DELIVERY_TOO_LARGE",
            "DARK_SHOPPING_EMPTY_DELIVERY",
          ].includes(error.code)
            ? "ERROR"
            : latest?.remoteOrderId
              ? "IN_PROCESS"
              : (latest?.attempts ?? 0) >= 5
                ? "ERROR"
                : "PENDING",
        lastError: safeFulfillmentError(error),
        lastCheckedAt: new Date(),
      },
    });
    return { id, status: "PENDING", error: safeFulfillmentError(error) };
  }
}

export async function fulfillDarkShoppingOrder(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
      deliveredAt: null,
      product: { darkShoppingListing: { isNot: null } },
    },
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          darkShoppingListing: {
            select: { id: true, supplierPriceRubCents: true },
          },
        },
      },
    },
  });
  if (!items.length) return [];

  await prisma.darkShoppingFulfillment.createMany({
    data: items.map((item) => ({
      listingId: item.product.darkShoppingListing!.id,
      orderItemId: item.id,
      idempotenceId: `ysello-${item.id}`,
      supplierUnitPriceRubCents:
        item.product.darkShoppingListing!.supplierPriceRubCents,
      quantity: item.quantity,
    })),
    skipDuplicates: true,
  });
  const fulfillments = await prisma.darkShoppingFulfillment.findMany({
    where: { orderItemId: { in: items.map((item) => item.id) } },
    select: { id: true, status: true },
  });
  const results = [];
  for (const fulfillment of fulfillments) {
    if (fulfillment.status === "FULFILLED") continue;
    results.push(await processDarkShoppingFulfillment(fulfillment.id));
  }
  return results;
}

export async function processPendingDarkShoppingFulfillments(limit = 10) {
  const missing = await prisma.orderItem.findMany({
    where: {
      deliveredAt: null,
      order: { payment: { is: { status: "PAID" } } },
      product: { darkShoppingListing: { isNot: null } },
      darkShoppingFulfillment: null,
    },
    take: limit,
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          darkShoppingListing: {
            select: { id: true, supplierPriceRubCents: true },
          },
        },
      },
    },
  });
  if (missing.length) {
    await prisma.darkShoppingFulfillment.createMany({
      data: missing.map((item) => ({
        listingId: item.product.darkShoppingListing!.id,
        orderItemId: item.id,
        idempotenceId: `ysello-${item.id}`,
        supplierUnitPriceRubCents:
          item.product.darkShoppingListing!.supplierPriceRubCents,
        quantity: item.quantity,
      })),
      skipDuplicates: true,
    });
  }
  const due = await prisma.darkShoppingFulfillment.findMany({
    where: {
      OR: [
        { status: "PENDING", attempts: { lt: 5 } },
        {
          status: "IN_PROCESS",
          OR: [
            { lastCheckedAt: null },
            { lastCheckedAt: { lt: new Date(Date.now() - 10_000) } },
          ],
        },
        {
          status: "PROCESSING",
          updatedAt: { lt: new Date(Date.now() - 2 * 60 * 1_000) },
        },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const fulfillment of due) {
    await processDarkShoppingFulfillment(fulfillment.id);
  }
  return due.length;
}

export function listDarkShoppingFulfillments() {
  return prisma.darkShoppingFulfillment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      remoteOrderId: true,
      status: true,
      supplierUnitPriceRubCents: true,
      quantity: true,
      attempts: true,
      lastError: true,
      lastCheckedAt: true,
      fulfilledAt: true,
      createdAt: true,
      orderItem: {
        select: {
          productName: true,
          order: { select: { id: true, orderNumber: true } },
        },
      },
    },
  });
}

export async function retryDarkShoppingFulfillment(id: string) {
  const existing = await prisma.darkShoppingFulfillment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) {
    throw new ApiError(
      404,
      "Supplier fulfillment not found.",
      "FULFILLMENT_NOT_FOUND",
    );
  }
  if (existing.status === "FULFILLED") return { id, status: "FULFILLED" };
  if (existing.status === "PROCESSING") {
    throw new ApiError(
      409,
      "This supplier fulfillment is already being processed.",
      "FULFILLMENT_ALREADY_PROCESSING",
    );
  }
  const reset = await prisma.darkShoppingFulfillment.updateMany({
    where: { id, status: { in: ["PENDING", "IN_PROCESS", "ERROR"] } },
    data: { status: "PENDING", attempts: 0, lastError: null },
  });
  if (reset.count !== 1) {
    throw new ApiError(
      409,
      "This supplier fulfillment changed while the retry was starting.",
      "FULFILLMENT_ALREADY_PROCESSING",
    );
  }
  return processDarkShoppingFulfillment(id);
}

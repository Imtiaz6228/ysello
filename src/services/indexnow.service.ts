import { ProductStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

// IndexNow ownership keys are public proof-of-control tokens, not secrets.
// This value is intentionally stable so search engines can verify the file.
export const INDEXNOW_KEY = "d6fa80fa7e3496a013b092ef35c21486";

function compactSlugs(slugs: Array<string | null | undefined>) {
  return slugs.filter(
    (slug, index, values): slug is string =>
      Boolean(slug) && values.indexOf(slug) === index,
  );
}

function categoryPath(category: {
  slug: string;
  parent?: { slug: string; parent?: { slug: string } | null } | null;
}) {
  const slugs = compactSlugs([
    category.parent?.parent?.slug,
    category.parent?.slug,
    category.slug,
  ]);
  return `/category/${compactSlugs([slugs[0], slugs[slugs.length - 1]]).join("/")}`;
}

function productPath(product: {
  slug: string;
  category: {
    slug: string;
    parent?: { slug: string; parent?: { slug: string } | null } | null;
  };
}) {
  return `${categoryPath(product.category).replace("/category/", "/product/")}/${product.slug}`;
}

function localizedUrls(origin: string, path: string) {
  const base = `${origin}${path === "/" ? "" : path}`;
  if (
    path === "/" ||
    path === "/catalog" ||
    path === "/games" ||
    path === "/gift-cards" ||
    path === "/topups" ||
    /^\/(product|category|stores)\//.test(path)
  ) {
    return [base, `${base}${base.includes("?") ? "&" : "?"}lang=zh-CN`, `${base}${base.includes("?") ? "&" : "?"}lang=ru`];
  }
  return [base];
}

export async function submitIndexNowUrls(urls: string[]) {
  const origin = env.APP_URL.replace(/\/+$/, "");
  const host = new URL(origin).host;
  const normalized = [...new Set(urls)]
    .filter((value) => {
      try {
        return new URL(value).host === host;
      } catch {
        return false;
      }
    })
    .slice(0, 10_000);
  if (!normalized.length) return { submitted: 0, status: 204 };

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/indexnow-key.txt`,
      urlList: normalized,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok && response.status !== 202) {
    const text = await response.text().catch(() => "");
    throw new Error(`IndexNow returned ${response.status}${text ? `: ${text.slice(0, 300)}` : ""}`);
  }
  return { submitted: normalized.length, status: response.status };
}

export async function submitFreshMarketplaceToIndexNow(days = 30) {
  const origin = env.APP_URL.replace(/\/+$/, "");
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000);
  const publicSellerFilter = {
    isSuspended: false,
    sellerProfile: { isSuspended: false },
  };
  const [products, categories, stores] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        updatedAt: { gte: since },
        category: { isActive: true },
        seller: publicSellerFilter,
      },
      take: 2500,
      orderBy: { updatedAt: "desc" },
      select: {
        slug: true,
        category: {
          select: {
            slug: true,
            parent: {
              select: {
                slug: true,
                parent: { select: { slug: true } },
              },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, updatedAt: { gte: since } },
      take: 2500,
      orderBy: { updatedAt: "desc" },
      select: {
        slug: true,
        parent: {
          select: {
            slug: true,
            parent: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.sellerProfile.findMany({
      where: {
        isVerified: true,
        isSuspended: false,
        updatedAt: { gte: since },
        user: { isSuspended: false },
      },
      take: 1000,
      orderBy: { updatedAt: "desc" },
      select: { slug: true },
    }),
  ]);

  const paths = [
    "/",
    "/catalog",
    "/games",
    "/gift-cards",
    "/topups",
    "/blog",
    ...products.map(productPath),
    ...categories.map(categoryPath),
    ...stores.map((store) => `/stores/${store.slug}`),
  ];
  const urls = paths.flatMap((path) => localizedUrls(origin, path));
  return submitIndexNowUrls(urls);
}

import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ProductStatus } from "@prisma/client";
import { env, isProduction, TRUSTED_APP_ORIGINS } from "./config/env.js";
import { issueCsrfToken } from "./lib/cookies.js";
import { uploadRoot } from "./middleware/upload.js";
import { csrfProtection } from "./middleware/csrf.js";
import {
  ApiError,
  asyncHandler,
  errorHandler,
  notFound,
} from "./middleware/error-handler.js";
import { generalLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.routes.js";
import { profileRouter } from "./routes/profile.routes.js";
import { sellerRouter } from "./routes/seller.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { marketplaceRouter } from "./routes/marketplace.routes.js";
import { commerceRouter } from "./routes/commerce.routes.js";
import { walletRouter } from "./routes/wallet.routes.js";
import { nexusRouter } from "./routes/nexus.routes.js";
import { prisma } from "./lib/prisma.js";
import { blogPosts } from "./content/blog.js";
import { publicPages, siteContentLastModified } from "./content/publicPages.js";
import {
  absolutePublicUrl,
  crawlableHeader,
  escapeHtml,
  noIndexRobots,
  renderSeoDocument,
  xmlEscape,
} from "./lib/seo-html.js";

function normalizeOrigin(value: string) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

type SeoCategoryNode = {
  id?: string;
  parentId?: string | null;
  slug: string;
  parent?: {
    slug: string;
    parent?: { slug: string } | null;
  } | null;
};

function compactSlugs(slugs: Array<string | null | undefined>) {
  return slugs.filter(
    (slug, index, values): slug is string =>
      Boolean(slug) && values.indexOf(slug) === index,
  );
}

function categorySeoPath(category: SeoCategoryNode) {
  const slugs = compactSlugs([
    category.parent?.parent?.slug,
    category.parent?.slug,
    category.slug,
  ]);
  return `/category/${compactSlugs([slugs[0], slugs[slugs.length - 1]]).join("/")}`;
}

function categorySeoPathFromFlat(
  category: SeoCategoryNode,
  categories: SeoCategoryNode[],
) {
  let current = category;
  const ancestry = [category.slug];
  const visited = new Set([category.slug]);
  while (current.parentId) {
    const parent = categories.find((item) => item.id === current.parentId);
    if (!parent || visited.has(parent.slug)) break;
    ancestry.unshift(parent.slug);
    visited.add(parent.slug);
    current = parent;
  }
  return `/category/${compactSlugs([
    ancestry[0],
    ancestry[ancestry.length - 1],
  ]).join("/")}`;
}

function productSeoPath(product: { slug: string; category: SeoCategoryNode }) {
  return `${categorySeoPath(product.category).replace("/category/", "/product/")}/${product.slug}`;
}

const allowedOriginRules = [
  ...TRUSTED_APP_ORIGINS,
  env.APP_URL,
  env.API_URL,
  ...(env.CORS_ORIGIN?.split(",") ?? []),
]
  .map(normalizeOrigin)
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOriginRules.some((rule) => {
    if (!rule.includes("*")) {
      return rule === normalizedOrigin;
    }

    const escaped = rule
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^.]+");
    return new RegExp(`^${escaped}$`, "i").test(normalizedOrigin);
  });
}

export const app = express();

app.set("trust proxy", isProduction ? 1 : 0);
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new ApiError(
          403,
          "Origin is not allowed by CORS.",
          "CORS_ORIGIN_DENIED",
        ),
      );
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(generalLimiter);

app.use(
  "/uploads",
  express.static(uploadRoot, {
    index: false,
    immutable: true,
    maxAge: "7d",
  }),
);

app.get(
  "/uploads/:fileName",
  asyncHandler(async (req, res) => {
    const requestedFileName = Array.isArray(req.params.fileName)
      ? req.params.fileName[0]
      : req.params.fileName;
    const fileName = path.basename(requestedFileName);
    if (!fileName || fileName !== requestedFileName) {
      res
        .status(400)
        .json({ message: "Invalid media path.", code: "MEDIA_PATH_INVALID" });
      return;
    }

    const upload = await prisma.publicUpload.findUnique({
      where: { fileName },
      select: { mimeType: true, data: true, sizeBytes: true, createdAt: true },
    });
    if (!upload) {
      res.status(404).json({
        message:
          "This media file is no longer available. Upload a replacement image.",
        code: "MEDIA_NOT_FOUND",
      });
      return;
    }

    res.setHeader("Content-Type", upload.mimeType);
    res.setHeader("Content-Length", String(upload.sizeBytes));
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("Last-Modified", upload.createdAt.toUTCString());
    res.send(Buffer.from(upload.data));
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: env.NODE_ENV });
});

function sendRequestToken(_req: express.Request, res: express.Response) {
  res.json({
    csrfToken: issueCsrfToken(res),
  });
}

app.get("/api/csrf", sendRequestToken);
app.get("/api/session/bootstrap", sendRequestToken);
app.get("/google-callback.php", (req, res) => {
  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
  res.redirect(307, `/api/auth/google/callback${query}`);
});

app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    req.path.length > 1 &&
    req.path.endsWith("/") &&
    !req.path.startsWith("/api/") &&
    !req.path.startsWith("/uploads/") &&
    req.accepts("html")
  ) {
    const queryIndex = req.originalUrl.indexOf("?");
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
    res.redirect(308, `${req.path.replace(/\/+$/, "")}${query}`);
    return;
  }
  next();
});

app.get("/robots.txt", (_req, res) => {
  const siteUrl = env.APP_URL.replace(/\/+$/, "");
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400",
  );
  res
    .type("text/plain")
    .send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /admin",
        "Disallow: /dashboard",
        "Disallow: /checkout",
        "Disallow: /orders",
        "Disallow: /seller/",
        "Disallow: /support",
        "Disallow: /cart",
        "Disallow: /sign-in",
        "Disallow: /sign-out",
        "Disallow: /register",
        "Disallow: /verify-email",
        "Disallow: /verify-required",
        "Disallow: /forgot-password",
        "Disallow: /reset-password",
        "Disallow: /*?*token=",
        `Sitemap: ${siteUrl}/sitemap.xml`,
        "",
      ].join("\n"),
    );
});

app.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const publicSellerFilter = {
      isSuspended: false,
      sellerProfile: { isVerified: true, isSuspended: false },
    };
    const [products, categories, stores] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: ProductStatus.APPROVED,
          category: { isActive: true },
          seller: publicSellerFilter,
        },
        select: {
          slug: true,
          updatedAt: true,
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
        where: { isActive: true },
        select: {
          slug: true,
          updatedAt: true,
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
          user: { isSuspended: false },
        },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    const contentModifiedAt = new Date(
      `${siteContentLastModified}T00:00:00.000Z`,
    );
    const urls = [
      ...publicPages.map((page) => ({
        path: page.path,
        updatedAt: contentModifiedAt,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      })),
      ...blogPosts.map((post) => ({
        path: `/blog/${post.slug}`,
        updatedAt: new Date(`${post.publishedIso}T00:00:00.000Z`),
        changeFrequency: "yearly",
        priority: 0.6,
      })),
      ...products.map((item) => ({
        path: productSeoPath(item),
        updatedAt: item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })),
      ...categories.map((item) => ({
        path: categorySeoPath(item),
        updatedAt: item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })),
      ...stores.map((item) => ({
        path: `/stores/${item.slug}`,
        updatedAt: item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })),
    ];
    const siteUrl = env.APP_URL.replace(/\/+$/, "");
    const xml = urls
      .map((item) =>
        [
          "  <url>",
          `    <loc>${xmlEscape(`${siteUrl}${item.path === "/" ? "" : item.path}`)}</loc>`,
          `    <lastmod>${item.updatedAt.toISOString()}</lastmod>`,
          `    <changefreq>${item.changeFrequency}</changefreq>`,
          `    <priority>${item.priority.toFixed(1)}</priority>`,
          "  </url>",
        ].join("\n"),
      )
      .join("\n");
    res.setHeader(
      "Cache-Control",
      "public, max-age=900, stale-while-revalidate=3600",
    );
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`,
      );
  }),
);

app.use("/api", csrfProtection);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/commerce", commerceRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/admin", adminRouter);
app.use("/api/nexus", nexusRouter);

// Railway builds both targets from this one root and serves data-backed public
// HTML so crawlers receive the same approved inventory the React app displays.
const frontendRoot = path.resolve(process.cwd(), "dist");
const frontendIndex = path.join(frontendRoot, "index.html");

if (isProduction && fs.existsSync(frontendIndex)) {
  const siteUrl = env.APP_URL.replace(/\/+$/, "");
  const frontendTemplate = fs.readFileSync(frontendIndex, "utf8");
  const publicSellerFilter = {
    isSuspended: false,
    sellerProfile: { isVerified: true, isSuspended: false },
  };
  const publicSlug = (value: string | undefined) =>
    value && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
      ? value
      : undefined;
  const canonicalUrl = (pathname: string) =>
    `${siteUrl}${pathname === "/" ? "" : pathname}`;
  const shell = (heading: string, intro: string, content = "") =>
    `<main class="seo-static-shell">${crawlableHeader()}<article><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(intro)}</p>${content}</article></main>`;
  const links = (
    items: Array<{ path: string; title: string; description?: string }>,
  ) =>
    `<ul>${items.map((item) => `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.title)}</a>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</li>`).join("")}</ul>`;
  const sendHtml = (res: express.Response, html: string, status = 200) => {
    res.status(status);
    res.setHeader(
      "Cache-Control",
      status === 200
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=3600"
        : "no-store",
    );
    res.setHeader("Content-Language", "en");
    res.type("html").send(html);
  };
  const sendSeoNotFound = (res: express.Response) => {
    const notFoundPath = path.join(frontendRoot, "404.html");
    res.setHeader("X-Robots-Tag", noIndexRobots);
    if (fs.existsSync(notFoundPath)) {
      sendHtml(res, fs.readFileSync(notFoundPath, "utf8"), 404);
      return;
    }
    sendHtml(
      res,
      renderSeoDocument(frontendTemplate, {
        title: "Page not found · Ysello",
        description:
          "The requested page could not be found. Browse the Ysello marketplace or return to the homepage.",
        canonicalUrl: canonicalUrl("/404"),
        noIndex: true,
        body: shell(
          "That page does not exist",
          "The address may be outdated or mistyped. Browse a valid marketplace page instead.",
        ),
      }),
      404,
    );
  };

  app.get(
    "/catalog",
    asyncHandler(async (_req, res) => {
      const [categories, products, stores] = await Promise.all([
        prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            slug: true,
            name: true,
            description: true,
            parent: {
              select: {
                slug: true,
                parent: { select: { slug: true } },
              },
            },
          },
        }),
        prisma.product.findMany({
          where: {
            status: ProductStatus.APPROVED,
            category: { isActive: true },
            seller: publicSellerFilter,
          },
          orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
          take: 96,
          select: {
            slug: true,
            name: true,
            shortDescription: true,
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
        prisma.sellerProfile.findMany({
          where: {
            isVerified: true,
            isSuspended: false,
            user: { isSuspended: false },
          },
          orderBy: [{ totalSales: "desc" }, { updatedAt: "desc" }],
          take: 24,
          select: { slug: true, storeName: true, about: true },
        }),
      ]);
      const content = [
        `<section><h2>Browse by category</h2>${links(categories.map((item) => ({ path: categorySeoPath(item), title: item.name, description: item.description })))}</section>`,
        `<section><h2>Approved marketplace listings</h2>${products.length ? links(products.map((item) => ({ path: productSeoPath(item), title: item.name, description: item.shortDescription }))) : "<p>No public listings are available yet.</p>"}</section>`,
        stores.length
          ? `<section><h2>Verified seller stores</h2>${links(stores.map((item) => ({ path: `/stores/${item.slug}`, title: item.storeName, description: item.about })))}</section>`
          : "",
      ].join("");
      const url = canonicalUrl("/catalog");
      sendHtml(
        res,
        renderSeoDocument(frontendTemplate, {
          title: "Browse digital products and services · Ysello",
          description:
            "Explore approved digital products and expert services by category, seller, price, and delivery type on Ysello.",
          canonicalUrl: url,
          body: shell(
            "Browse digital products and expert services",
            "Compare approved listings with clear delivery, seller, licensing, and support details.",
            content,
          ),
          schema: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Ysello digital marketplace catalog",
            description:
              "Approved digital products and expert services on Ysello.",
            url,
          },
        }),
      );
    }),
  );

  app.get("/categories/:slug", (req, res) => {
    const slug = Array.isArray(req.params.slug)
      ? req.params.slug[0]
      : req.params.slug;
    res.redirect(308, `/category/${encodeURIComponent(slug)}`);
  });

  app.get(
    ["/category/:rootSlug/:slug", "/category/:slug"],
    asyncHandler(async (req, res) => {
      const requestedSlug = publicSlug(
        Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug,
      );
      if (!requestedSlug) {
        sendSeoNotFound(res);
        return;
      }
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          parentId: true,
          slug: true,
          name: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
          updatedAt: true,
        },
      });
      const category = categories.find((item) => item.slug === requestedSlug);
      if (!category) {
        sendSeoNotFound(res);
        return;
      }
      const categoryIds = new Set([category.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of categories) {
          if (
            item.parentId &&
            categoryIds.has(item.parentId) &&
            !categoryIds.has(item.id)
          ) {
            categoryIds.add(item.id);
            changed = true;
          }
        }
      }
      const products = await prisma.product.findMany({
        where: {
          categoryId: { in: [...categoryIds] },
          status: ProductStatus.APPROVED,
          seller: publicSellerFilter,
        },
        orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
        take: 96,
        select: {
          slug: true,
          name: true,
          shortDescription: true,
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
      });
      const childLinks = categories.filter(
        (item) => item.parentId === category.id,
      );
      const canonicalPath = categorySeoPathFromFlat(category, categories);
      if (req.path !== canonicalPath) {
        res.redirect(308, canonicalPath);
        return;
      }
      const url = canonicalUrl(canonicalPath);
      const customTitle = category.seoTitle?.trim();
      const title = customTitle
        ? customTitle.toLowerCase().includes("ysello")
          ? customTitle
          : `${customTitle} · Ysello`
        : `${category.name} digital products and services · Ysello`;
      const description =
        category.seoDescription?.trim() || category.description;
      const itemList = products.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: canonicalUrl(productSeoPath(item)),
        name: item.name,
      }));
      const content = `${childLinks.length ? `<section><h2>${escapeHtml(category.name)} specialties</h2>${links(childLinks.map((item) => ({ path: categorySeoPathFromFlat(item, categories), title: item.name, description: item.description })))}</section>` : ""}<section><h2>Available listings</h2>${products.length ? links(products.map((item) => ({ path: productSeoPath(item), title: item.name, description: item.shortDescription }))) : "<p>No approved listings are available in this exact category yet.</p>"}</section>`;
      sendHtml(
        res,
        renderSeoDocument(frontendTemplate, {
          title,
          description,
          canonicalUrl: url,
          body: shell(category.name, category.description, content),
          schema: [
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: category.name,
              description,
              url,
            },
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: itemList,
            },
          ],
        }),
      );
    }),
  );

  app.get("/products/:slug", (req, res) => {
    const slug = Array.isArray(req.params.slug)
      ? req.params.slug[0]
      : req.params.slug;
    res.redirect(308, `/product/${encodeURIComponent(slug)}`);
  });

  app.get(
    [
      "/product/:rootSlug/:categorySlug/:slug",
      "/product/:categorySlug/:slug",
      "/product/:slug",
    ],
    asyncHandler(async (req, res) => {
      const requestedSlug = publicSlug(
        Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug,
      );
      if (!requestedSlug) {
        sendSeoNotFound(res);
        return;
      }
      const product = await prisma.product.findFirst({
        where: {
          slug: requestedSlug,
          status: ProductStatus.APPROVED,
          category: { isActive: true },
          seller: publicSellerFilter,
        },
        include: {
          category: {
            select: {
              name: true,
              slug: true,
              parent: {
                select: {
                  slug: true,
                  parent: { select: { slug: true } },
                },
              },
            },
          },
          seller: {
            select: {
              sellerProfile: { select: { storeName: true, slug: true } },
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
      if (!product || !product.seller.sellerProfile) {
        sendSeoNotFound(res);
        return;
      }
      const priceCents =
        product.salePriceCents && product.salePriceCents > 0
          ? Math.min(product.priceCents, product.salePriceCents)
          : product.priceCents;
      const inStock =
        product.type === "SERVICE" ||
        product._count.files > 0 ||
        product._count.inventoryItems > 0;
      const canonicalPath = productSeoPath(product);
      if (req.path !== canonicalPath) {
        res.redirect(308, canonicalPath);
        return;
      }
      const url = canonicalUrl(canonicalPath);
      const imageUrl = absolutePublicUrl(siteUrl, product.coverImageUrl);
      const seller = product.seller.sellerProfile;
      const sellerName =
        product.isOfficial && product.officialStoreName
          ? product.officialStoreName
          : seller.storeName;
      const customTitle = product.seoTitle?.trim();
      const title = customTitle
        ? customTitle.toLowerCase().includes("ysello")
          ? customTitle
          : `${customTitle} · Ysello`
        : `${product.name} · Ysello`;
      const description =
        product.seoDescription?.trim() || product.shortDescription;
      const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description,
        url,
        sku: product.sku || product.id,
        category: product.category.name,
        ...(imageUrl ? { image: [imageUrl] } : {}),
        offers: {
          "@type": "Offer",
          url,
          price: (priceCents / 100).toFixed(2),
          priceCurrency: "USD",
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: sellerName,
            url: canonicalUrl(`/stores/${seller.slug}`),
          },
        },
      };
      if (Number(product.averageRating) > 0 && product.reviewCount > 0) {
        schema.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(product.averageRating),
          reviewCount: product.reviewCount,
        };
      }
      const facts = [
        product.deliveryNote
          ? `<li><strong>Delivery:</strong> ${escapeHtml(product.deliveryNote)}</li>`
          : "",
        product.type
          ? `<li><strong>Type:</strong> ${escapeHtml(product.type === "DOWNLOAD" ? "Digital download" : "Expert service")}</li>`
          : "",
        product.sku
          ? `<li><strong>SKU:</strong> ${escapeHtml(product.sku)}</li>`
          : "",
        `<li><strong>Availability:</strong> ${inStock ? "Available" : "Currently unavailable"}</li>`,
      ]
        .filter(Boolean)
        .join("");
      const content = `<section><h2>Product details</h2><p>${escapeHtml(product.description)}</p><ul>${facts}</ul></section><section><h2>Seller and category</h2><p>Sold by <a href="/stores/${escapeHtml(seller.slug)}">${escapeHtml(sellerName)}</a> in <a href="${escapeHtml(categorySeoPath(product.category))}">${escapeHtml(product.category.name)}</a>.</p><p><strong>Price:</strong> $${(priceCents / 100).toFixed(2)} USD</p></section>`;
      sendHtml(
        res,
        renderSeoDocument(frontendTemplate, {
          title,
          description,
          canonicalUrl: url,
          imageUrl,
          imageAlt: product.name,
          type: "product",
          body: shell(product.name, product.shortDescription, content),
          schema,
        }),
      );
    }),
  );

  app.get(
    "/stores/:slug",
    asyncHandler(async (req, res) => {
      const requestedSlug = publicSlug(
        Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug,
      );
      if (!requestedSlug) {
        sendSeoNotFound(res);
        return;
      }
      const store = await prisma.sellerProfile.findFirst({
        where: {
          slug: requestedSlug,
          isVerified: true,
          isSuspended: false,
          user: { isSuspended: false },
        },
        select: {
          userId: true,
          storeName: true,
          slug: true,
          about: true,
          logoUrl: true,
        },
      });
      if (!store) {
        sendSeoNotFound(res);
        return;
      }
      const products = await prisma.product.findMany({
        where: {
          sellerId: store.userId,
          status: ProductStatus.APPROVED,
          category: { isActive: true },
        },
        orderBy: { publishedAt: "desc" },
        select: {
          slug: true,
          name: true,
          shortDescription: true,
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
      });
      const url = canonicalUrl(`/stores/${store.slug}`);
      const imageUrl = absolutePublicUrl(siteUrl, store.logoUrl);
      const content = `<section><h2>Products from ${escapeHtml(store.storeName)}</h2>${products.length ? links(products.map((item) => ({ path: productSeoPath(item), title: item.name, description: item.shortDescription }))) : "<p>This verified store has no public listings at the moment.</p>"}</section>`;
      sendHtml(
        res,
        renderSeoDocument(frontendTemplate, {
          title: `${store.storeName} digital store · Ysello`,
          description: store.about,
          canonicalUrl: url,
          imageUrl,
          imageAlt: `${store.storeName} logo`,
          body: shell(store.storeName, store.about, content),
          schema: {
            "@context": "https://schema.org",
            "@type": "Store",
            name: store.storeName,
            description: store.about,
            url,
            ...(imageUrl ? { image: imageUrl } : {}),
          },
        }),
      );
    }),
  );

  const staticPaths = publicPages
    .map((page) => page.path)
    .filter((pathname) => pathname !== "/catalog");
  app.get(staticPaths, (req, res) => {
    const filePath =
      req.path === "/"
        ? frontendIndex
        : path.join(frontendRoot, `${req.path.slice(1)}.html`);
    if (!fs.existsSync(filePath)) {
      sendSeoNotFound(res);
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(filePath);
  });

  const blogSlugs = new Set(blogPosts.map((post) => post.slug));
  app.get("/blog/:slug", (req, res) => {
    if (!blogSlugs.has(req.params.slug)) {
      sendSeoNotFound(res);
      return;
    }
    const filePath = path.join(frontendRoot, "blog", `${req.params.slug}.html`);
    if (!fs.existsSync(filePath)) {
      sendSeoNotFound(res);
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(filePath);
  });

  app.use(
    express.static(frontendRoot, {
      index: false,
      redirect: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    }),
  );

  const privateSpaPaths = [
    "/cart",
    "/sign-in",
    "/forgot-password",
    "/reset-password",
    "/register",
    "/verify-email",
    "/verify-required",
    "/dashboard",
    "/checkout",
    "/checkout/confirmation",
    "/support",
    "/sign-out",
    "/seller",
    "/seller/apply",
    "/admin",
    "/admin/seller-applications",
    "/admin/earnings",
    "/admin/approvals",
    "/admin/live",
    "/admin/kb/editor",
  ];
  app.get(privateSpaPaths, (req, res) => {
    res.setHeader("X-Robots-Tag", noIndexRobots);
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(frontendIndex);
  });
  app.get("/orders/:id", (_req, res) => {
    res.setHeader("X-Robots-Tag", noIndexRobots);
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(frontendIndex);
  });

  app.get("/404", (_req, res) => sendSeoNotFound(res));
  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) {
      next();
      return;
    }
    sendSeoNotFound(res);
  });
}

app.use(notFound);
app.use(errorHandler);

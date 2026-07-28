import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { blogPosts } from "../src/content/blog.ts";
import {
  publicPages,
  siteContentLastModified,
} from "../src/content/publicPages.ts";
import { g2aDemoProducts } from "../src/data/g2aDemoCatalog.ts";
import { marketplaceTaxonomy } from "../src/data/marketplaceTaxonomy.ts";
import { legalPages } from "../src/pages/LegalPage.tsx";

const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const canonicalSiteUrl = "https://ysello.com";
const configuredSiteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.APP_URL ||
  (vercelHost ? `https://${vercelHost}` : canonicalSiteUrl)
).replace(/\/+$/, "");

const template = await readFile("dist/index.html", "utf8");
const indexRobots =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const noIndexRobots = "noindex, nofollow, noarchive";

function flattenTaxonomy() {
  const result = [];
  marketplaceTaxonomy.forEach((root) => {
    result.push({
      ...root,
      parentSlug: null,
      rootSlug: root.slug,
      depth: 0,
      pathNames: [root.name],
    });
    const visit = (nodes, parentSlug, depth, pathNames) => {
      nodes.forEach((node) => {
        const entry = {
          ...node,
          parentSlug,
          rootSlug: root.slug,
          depth,
          pathNames: [...pathNames, node.name],
        };
        result.push(entry);
        if (node.children?.length)
          visit(node.children, node.slug, depth + 1, entry.pathNames);
      });
    };
    visit(root.subcategories, root.slug, 1, [root.name]);
  });
  return result;
}

const taxonomyEntries = flattenTaxonomy();
const taxonomyBySlug = new Map(
  taxonomyEntries.map((category) => [category.slug, category]),
);

function categoryContains(productCategorySlug, selectedSlug) {
  let current = taxonomyBySlug.get(productCategorySlug);
  const visited = new Set();
  while (current && !visited.has(current.slug)) {
    if (current.slug === selectedSlug) return true;
    visited.add(current.slug);
    current = current.parentSlug
      ? taxonomyBySlug.get(current.parentSlug)
      : undefined;
  }
  return productCategorySlug === selectedSlug;
}

function rotate(items, seed) {
  if (items.length < 2) return items;
  const offset =
    [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function productsForCategory(category) {
  const direct = g2aDemoProducts.filter((product) =>
    categoryContains(product.categorySlug, category.slug),
  );
  if (direct.length) return { items: direct, isFallback: false };
  let related =
    category.rootSlug === "outlet"
      ? g2aDemoProducts.filter(
          (product) =>
            product.originalPriceCents &&
            product.originalPriceCents > product.priceCents,
        )
      : g2aDemoProducts.filter((product) =>
          categoryContains(product.categorySlug, category.rootSlug),
        );
  if (!related.length) related = g2aDemoProducts;
  return {
    items: rotate(related, category.slug).slice(0, 24),
    isFallback: true,
  };
}

const commonLinks = [
  ["/", "Marketplace home"],
  ["/catalog", "Browse products and services"],
  ["/category/gaming", "Gaming"],
  ["/category/software", "Software"],
  ["/category/subscriptions", "Subscriptions"],
  ["/category/gift-cards", "Gift cards"],
  ["/blog", "Buying and selling guides"],
  ["/buyer-protection", "Buyer protection"],
  ["/seller-policy", "Seller policy"],
  ["/terms", "Terms and conditions"],
  ["/privacy", "Privacy policy"],
];

const articlePages = blogPosts.map((post) => ({
  path: `/blog/${post.slug}`,
  title: `${post.title} · Ysello`,
  description: post.excerpt,
  heading: post.title,
  intro: post.excerpt,
  type: "article",
  changeFrequency: "yearly",
  priority: 0.6,
  post,
}));

const categoryPages = taxonomyEntries.map((category) => {
  const discovery = productsForCategory(category);
  return {
    path: `/category/${category.slug}`,
    title: `Buy ${category.name} digital products and deals · Ysello`,
    description: `${category.description} Compare verified sellers, clear delivery terms and current marketplace pricing on Ysello.`,
    heading: `Buy ${category.name} digital products`,
    intro: category.description,
    type: "website",
    changeFrequency: "weekly",
    priority: category.depth === 0 ? 0.9 : category.depth === 1 ? 0.8 : 0.7,
    kind: "category",
    category,
    products: discovery.items,
    isFallback: discovery.isFallback,
  };
});

const productPages = g2aDemoProducts.map((product) => ({
  path: `/product/${product.slug}`,
  title: `Buy ${product.title} online · Ysello`,
  description: `${product.description} Compare delivery details, seller information and buyer protection before checkout.`,
  heading: product.title,
  intro: product.description,
  type: "product",
  changeFrequency: "weekly",
  priority: 0.8,
  kind: "product",
  imageUrl: product.imageUrl,
  product,
}));

const pages = [
  ...publicPages,
  ...articlePages,
  ...categoryPages,
  ...productPages,
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absolutePath(path) {
  if (!configuredSiteUrl) return path;
  return `${configuredSiteUrl}${path === "/" ? "" : path}`;
}

function replaceMeta(html, attribute, key, value) {
  const expression = new RegExp(
    `<meta\\s+${attribute}=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function staticNavigation() {
  return `<nav aria-label="Marketplace pages">${commonLinks
    .map(([path, label]) => `<a href="${path}">${escapeHtml(label)}</a>`)
    .join("")}</nav>`;
}

function sectionsMarkup(sections) {
  return sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`,
    )
    .join("");
}

function links(items) {
  return `<ul>${items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.title)}</a>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</li>`,
    )
    .join("")}</ul>`;
}

function categoryBody(page) {
  const children = taxonomyEntries.filter(
    (category) => category.parentSlug === page.category.slug,
  );
  const categories = children.length
    ? `<section><h2>Explore ${escapeHtml(page.category.name)}</h2>${links(
        children.map((category) => ({
          path: `/category/${category.slug}`,
          title: category.name,
          description: category.description,
        })),
      )}</section>`
    : "";
  const fallback = page.isFallback
    ? `<p>Seller listings can be published directly in this category. These relevant department picks keep the page useful while more focused offers are added.</p>`
    : "";
  return `${categories}<section><h2>Popular ${escapeHtml(
    page.category.name,
  )} offers</h2>${fallback}${links(
    page.products.map((product) => ({
      path: `/product/${product.slug}`,
      title: product.title,
      description: product.description,
    })),
  )}</section><section><h2>Compare before checkout</h2><p>Review the platform, region, delivery method, seller information, price and support terms on each listing before buying.</p></section>`;
}

function productBody(page) {
  const product = page.product;
  const facts = Object.entries(product.facts ?? {})
    .map(
      ([name, value]) =>
        `<li><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</li>`,
    )
    .join("");
  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(
        product.title,
      )}" width="640" height="640" />`
    : "";
  return `<section>${image}<h2>Offer details</h2><p>${escapeHtml(
    product.longDescription,
  )}</p><ul>${facts}<li><strong>Delivery:</strong> ${escapeHtml(
    product.delivery,
  )}</li><li><strong>Availability:</strong> Available</li></ul><p><strong>Price:</strong> $${(
    product.priceCents / 100
  ).toFixed(
    2,
  )} USD</p></section><section><h2>Seller and category</h2><p>Sold by <a href="/stores/${escapeHtml(
    product.sellerSlug,
  )}">${escapeHtml(product.seller)}</a> in <a href="/category/${escapeHtml(
    product.categorySlug,
  )}">${escapeHtml(product.category)}</a>.</p></section>`;
}

function pageBody(page) {
  const legal = legalPages[page.path];
  const article = "post" in page ? page.post : undefined;
  let content = "";

  if (page.kind === "category") {
    content = categoryBody(page);
  } else if (page.kind === "product") {
    content = productBody(page);
  } else if (legal) {
    content = sectionsMarkup(legal.sections);
  } else if (article) {
    content = `<p><time datetime="${article.publishedIso}">${escapeHtml(
      article.published,
    )}</time> · ${escapeHtml(article.time)} read</p>${sectionsMarkup(
      article.sections,
    )}`;
  } else if (page.path === "/blog") {
    content = `<section><h2>Latest marketplace guides</h2>${links(
      blogPosts.map((post) => ({
        path: `/blog/${post.slug}`,
        title: post.title,
        description: post.excerpt,
      })),
    )}</section>`;
  } else if (page.path === "/catalog") {
    content = `<section><h2>Browse every marketplace department</h2>${links(
      marketplaceTaxonomy.map((category) => ({
        path: `/category/${category.slug}`,
        title: category.name,
        description: category.description,
      })),
    )}</section><section><h2>Popular products</h2>${links(
      g2aDemoProducts.map((product) => ({
        path: `/product/${product.slug}`,
        title: product.title,
        description: product.description,
      })),
    )}</section>`;
  } else if (page.path === "/") {
    content = `<section><h2>Explore games, software, subscriptions and gift cards</h2>${links(
      marketplaceTaxonomy.map((category) => ({
        path: `/category/${category.slug}`,
        title: category.name,
        description: category.description,
      })),
    )}</section><section><h2>Digital marketplace questions</h2><h3>What can I buy on Ysello?</h3><p>Ysello features games, software, gift cards, subscriptions, creative resources and expert digital services.</p><h3>How does digital delivery work?</h3><p>Each listing explains its delivery method and timing before checkout.</p></section>`;
  }

  return `<main class="seo-static-shell"><header><a href="/" aria-label="Ysello home">Ysello Digital Marketplace</a>${staticNavigation()}</header><article><h1>${escapeHtml(
    page.heading,
  )}</h1><p>${escapeHtml(page.intro)}</p>${content}</article></main>`;
}

function categoryStructuredData(page, canonical) {
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Marketplace",
      item: absolutePath("/catalog"),
    },
  ];
  if (
    page.category.rootSlug !== page.category.slug &&
    taxonomyBySlug.has(page.category.rootSlug)
  ) {
    const root = taxonomyBySlug.get(page.category.rootSlug);
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: root.name,
      item: absolutePath(`/category/${root.slug}`),
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: page.category.name,
    item: canonical,
  });
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.heading,
      description: page.description,
      url: canonical,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: page.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.title,
        url: absolutePath(`/product/${product.slug}`),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems,
    },
  ];
}

function productStructuredData(page, canonical) {
  const product = page.product;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: page.description,
      url: canonical,
      sku: product.sku || product.id,
      category: product.category,
      ...(product.imageUrl ? { image: [absolutePath(product.imageUrl)] } : {}),
      offers: {
        "@type": "Offer",
        url: canonical,
        price: (product.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: product.seller,
          url: absolutePath(`/stores/${product.sellerSlug}`),
        },
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviews,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Marketplace",
          item: absolutePath("/catalog"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: product.category,
          item: absolutePath(`/category/${product.categorySlug}`),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.title,
          item: canonical,
        },
      ],
    },
  ];
}

function structuredData(page, canonical) {
  const siteHome = configuredSiteUrl || "/";
  if (page.kind === "category") return categoryStructuredData(page, canonical);
  if (page.kind === "product") return productStructuredData(page, canonical);
  const article = "post" in page ? page.post : undefined;
  if (article) {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      datePublished: article.publishedIso,
      dateModified: article.publishedIso,
      mainEntityOfPage: canonical,
      author: { "@type": "Organization", name: "Ysello", url: siteHome },
      publisher: { "@type": "Organization", name: "Ysello", url: siteHome },
    };
  }
  if (page.path === "/") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Ysello",
        url: siteHome,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Ysello",
        url: siteHome,
        potentialAction: {
          "@type": "SearchAction",
          target: `${configuredSiteUrl}/catalog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ];
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.heading,
    description: page.description,
    url: canonical,
  };
}

function replaceRoot(html, body) {
  const expression = /(<div\s+id=["']root["']>)[\s\S]*(<\/div>\s*<\/body>)/i;
  if (!expression.test(html))
    throw new Error("Could not locate the application root in the built HTML.");
  return html.replace(expression, `$1${body}$2`);
}

function renderPage(page, { noIndex = false } = {}) {
  const canonical = absolutePath(page.path);
  const socialImage = absolutePath(page.imageUrl || "/og-default.png");
  const robots = noIndex ? noIndexRobots : indexRobots;
  const pageSchema = structuredData(page, canonical);
  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(page.title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "name", "robots", robots);
  html = replaceMeta(html, "name", "googlebot", robots);
  html = replaceMeta(html, "name", "bingbot", robots);
  html = replaceMeta(html, "property", "og:site_name", "Ysello");
  html = replaceMeta(html, "property", "og:locale", "en_US");
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:type", page.type ?? "website");
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "property", "og:image", socialImage);
  html = replaceMeta(
    html,
    "property",
    "og:image:alt",
    page.kind === "product" ? page.product.title : "Ysello digital marketplace",
  );
  html = replaceMeta(html, "name", "twitter:card", "summary_large_image");
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", socialImage);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, "");
  html = html.replace(
    /<script\s+id=["']page-structured-data["'][\s\S]*?<\/script>/i,
    "",
  );
  html = html.replace(
    "</head>",
    `    <link rel="canonical" href="${escapeHtml(
      canonical,
    )}" />\n    <script id="page-structured-data" type="application/ld+json">${JSON.stringify(
      pageSchema,
    ).replaceAll("<", "\\u003c")}</script>\n  </head>`,
  );
  return replaceRoot(html, pageBody(page));
}

for (const page of pages) {
  const output =
    page.path === "/"
      ? "dist/index.html"
      : join("dist", `${page.path.slice(1)}.html`);
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, renderPage(page), "utf8");
}

const notFoundPage = {
  path: "/404",
  title: "Page not found · Ysello",
  description:
    "The requested page could not be found. Browse the Ysello marketplace or return to the homepage.",
  heading: "That page does not exist",
  intro:
    "The address may be outdated or mistyped. Continue with a valid marketplace page below.",
  changeFrequency: "yearly",
  priority: 0,
};
await writeFile(
  "dist/404.html",
  renderPage(notFoundPage, { noIndex: true }),
  "utf8",
);

const sitemapUrls = pages
  .filter((page) => page.path !== "/404")
  .map((page) => {
    const lastModified =
      page.product?.publishedAt?.slice(0, 10) ||
      page.post?.publishedIso ||
      siteContentLastModified;
    return [
      "  <url>",
      `    <loc>${escapeHtml(absolutePath(page.path))}</loc>`,
      `    <lastmod>${lastModified}</lastmod>`,
      `    <changefreq>${page.changeFrequency}</changefreq>`,
      `    <priority>${Number(page.priority).toFixed(1)}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
  "utf8",
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /seller\nDisallow: /dashboard\nDisallow: /checkout\nSitemap: ${absolutePath("/sitemap.xml")}\n`,
  "utf8",
);

console.log(
  `Prerendered ${pages.length} public routes, ${categoryPages.length} category pages, ${productPages.length} product pages, a sitemap, and a production 404 page.`,
);

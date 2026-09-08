type SeoDocumentOptions = {
  title: string;
  description: string;
  canonicalUrl: string;
  body: string;
  type?: "website" | "article" | "product";
  imageUrl?: string | null;
  imageAlt?: string;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  noIndex?: boolean;
};

export const indexRobots =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
export const noIndexRobots = "noindex, nofollow, noarchive";

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function replaceMeta(
  html: string,
  attribute: "name" | "property",
  key: string,
  value: string,
) {
  const expression = new RegExp(
    `<meta\\s+${attribute}=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function replaceRoot(html: string, body: string) {
  const expression = /(<div\s+id=["']root["']>)[\s\S]*(<\/div>\s*<\/body>)/i;
  if (!expression.test(html))
    throw new Error("Could not locate the application root in the built HTML.");
  return html.replace(expression, `$1${body}$2`);
}

export function absolutePublicUrl(siteUrl: string, value?: string | null) {
  if (!value) return undefined;
  try {
    return new URL(value, `${siteUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return undefined;
  }
}

export function crawlableHeader() {
  return `<header><a href="/" aria-label="Ysello home">Ysello Digital Marketplace</a><nav aria-label="Marketplace pages"><a href="/catalog">Browse products and services</a><a href="/blog">Guides</a><a href="/buyer-protection">Buyer protection</a><a href="/refund-policy">Refund policy</a><a href="/seller-policy">Seller policy</a><a href="/prohibited-products">Prohibited products</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/copyright">IP complaints</a><a href="/about">About</a><a href="/contact">Contact</a></nav></header>`;
}

export function renderSeoDocument(
  template: string,
  options: SeoDocumentOptions,
) {
  const robots = options.noIndex ? noIndexRobots : indexRobots;
  const socialImageUrl =
    options.imageUrl ||
    new URL("/og-default.png", options.canonicalUrl).toString();
  const socialImageAlt =
    options.imageAlt ||
    (options.imageUrl ? options.title : "Ysello digital marketplace");
  let html = template.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(options.title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", options.description);
  html = replaceMeta(html, "name", "robots", robots);
  html = replaceMeta(html, "name", "googlebot", robots);
  html = replaceMeta(html, "name", "bingbot", robots);
  html = replaceMeta(html, "property", "og:site_name", "Ysello");
  html = replaceMeta(html, "property", "og:locale", "en_US");
  html = replaceMeta(html, "property", "og:title", options.title);
  html = replaceMeta(html, "property", "og:description", options.description);
  html = replaceMeta(html, "property", "og:type", options.type ?? "website");
  html = replaceMeta(html, "property", "og:url", options.canonicalUrl);
  html = replaceMeta(html, "name", "twitter:card", "summary_large_image");
  html = replaceMeta(html, "name", "twitter:title", options.title);
  html = replaceMeta(html, "name", "twitter:description", options.description);

  html = replaceMeta(html, "property", "og:image", socialImageUrl);
  html = replaceMeta(html, "property", "og:image:alt", socialImageAlt);
  html = replaceMeta(html, "name", "twitter:image", socialImageUrl);
  html = replaceMeta(html, "name", "twitter:image:alt", socialImageAlt);

  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/i, "");
  html = html.replace(
    /<script\s+id=["']page-structured-data["'][\s\S]*?<\/script>\s*/i,
    "",
  );
  const schema = options.schema
    ? `<script id="page-structured-data" type="application/ld+json">${JSON.stringify(options.schema).replaceAll("<", "\\u003c")}</script>`
    : "";
  html = html.replace(
    "</head>",
    `    <link rel="canonical" href="${escapeHtml(options.canonicalUrl)}" />\n    ${schema}\n  </head>`,
  );
  return replaceRoot(html, options.body);
}

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const publicFiles = [
  "index.html",
  "catalog.html",
  "blog.html",
  "about.html",
  "contact.html",
  "terms.html",
  "privacy.html",
  "refund-policy.html",
  "seller-policy.html",
  "buyer-protection.html",
  "prohibited-products.html",
  "copyright.html",
  "blog/evaluate-digital-product-before-checkout.html",
  "blog/write-a-trustworthy-product-page.html",
  "blog/why-account-and-credential-trading-is-not-allowed.html",
  "blog/versioning-digital-downloads.html",
];

test("every fixed public route ships useful, unique, indexable HTML", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const file of publicFiles) {
    const html = readFileSync(`dist/${file}`, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const description = html.match(
      /<meta name="description" content="([^"]+)"/i,
    )?.[1];
    assert.ok(title && !titles.has(title), `${file} needs a unique title`);
    assert.ok(
      description && !descriptions.has(description),
      `${file} needs a unique description`,
    );
    titles.add(title);
    descriptions.add(description);
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/ysello\.com(?:\/[^"]*)?"/,
    );
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/ysello\.com\/og-default\.png"/,
    );
    assert.match(
      html,
      /<meta name="twitter:card" content="summary_large_image"/,
    );
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /<a href="\/catalog">/);
    assert.doesNotMatch(
      html,
      /localhost|codex-preview|YOUR_[A-Z_]+|VITE_[A-Z_]+/,
    );
  }
});

test("404 and deployment configuration prevent soft-404 indexing", () => {
  const html = readFileSync("dist/404.html", "utf8");
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.match(html, /noindex, nofollow, noarchive/);
  assert.match(html, /<h1>That page does not exist<\/h1>/);
  assert.equal(vercel.trailingSlash, false);
  assert.ok(!vercel.rewrites.some((rewrite) => rewrite.source === "/(.*)"));
  assert.ok(
    vercel.rewrites.some(
      (rewrite) => rewrite.source === "/admin" && rewrite.destination === "/",
    ),
  );
  assert.ok(
    vercel.rewrites.some(
      (rewrite) =>
        rewrite.source === "/admin/:path*" && rewrite.destination === "/",
    ),
  );
  assert.ok(
    !vercel.rewrites.some((rewrite) => rewrite.destination === "/index.html"),
    "clean URL deployments must not rewrite private SPA routes through the redirected /index.html path",
  );
});

test("category and product routes ship crawlable G2A-style marketplace SEO", () => {
  const category = readFileSync(
    "dist/category/gaming/steam-games.html",
    "utf8",
  );
  const product = readFileSync(
    "dist/product/gaming/steam-games/halo-infinite-campaign-pc.html",
    "utf8",
  );
  const sitemap = readFileSync("dist/sitemap.xml", "utf8");
  const robots = readFileSync("dist/robots.txt", "utf8");

  assert.match(
    category,
    /canonical" href="https:\/\/ysello\.com\/category\/gaming\/steam-games"/,
  );
  assert.match(category, /"@type":"CollectionPage"/);
  assert.match(category, /"@type":"ItemList"/);
  assert.match(
    category,
    /href="\/product\/gaming\/steam-games\/halo-infinite-campaign-pc"/,
  );
  assert.match(
    product,
    /canonical" href="https:\/\/ysello\.com\/product\/gaming\/steam-games\/halo-infinite-campaign-pc"/,
  );
  assert.match(product, /property="og:type" content="product"/);
  assert.match(product, /"@type":"Product"/);
  assert.match(product, /"@type":"BreadcrumbList"/);
  assert.match(sitemap, /\/category\/gaming<\/loc>/);
  assert.match(sitemap, /\/category\/gaming\/steam-games<\/loc>/);
  assert.match(
    sitemap,
    /\/product\/gaming\/steam-games\/halo-infinite-campaign-pc<\/loc>/,
  );
  assert.match(robots, /Sitemap: https:\/\/ysello\.com\/sitemap\.xml/);
});

test("crawler endpoints include only public inventory and current content dates", () => {
  const api = readFileSync("src/api-app.ts", "utf8");
  assert.match(api, /Disallow: \/api\//);
  assert.match(api, /Sitemap:/);
  assert.match(api, /siteContentLastModified/);
  assert.match(
    api,
    /sellerProfile: \{ isVerified: true, isSuspended: false \}/,
  );
  assert.match(api, /<changefreq>/);
  assert.match(api, /<priority>/);
});

test("verification tags are opt-in and production output contains no fake codes", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  for (const variable of [
    "VITE_GOOGLE_SITE_VERIFICATION",
    "VITE_BING_SITE_VERIFICATION",
    "VITE_YANDEX_SITE_VERIFICATION",
    "VITE_BAIDU_SITE_VERIFICATION",
  ]) {
    assert.match(vite, new RegExp(variable));
  }
  assert.doesNotMatch(
    readFileSync("dist/index.html", "utf8"),
    /site-verification[^>]+content="(?:YOUR|PLACEHOLDER|CHANGE_ME)/i,
  );
});

test("release output has icons and no source maps", () => {
  for (const file of [
    "favicon.svg",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "icon-maskable-512.png",
    "og-default.png",
    "site.webmanifest",
  ]) {
    assert.equal(
      existsSync(`dist/${file}`),
      true,
      `${file} should be deployed`,
    );
  }
  assert.equal(
    readdirSync("dist/assets").some((file) => file.endsWith(".map")),
    false,
  );
});

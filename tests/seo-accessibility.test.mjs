import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("prerenders public routes with unique metadata", () => {
  const about = readFileSync("dist/about.html", "utf8");
  const blog = readFileSync(
    "dist/blog/evaluate-digital-product-before-checkout.html",
    "utf8",
  );
  assert.match(about, /<title>About the Ysello digital marketplace<\/title>/);
  assert.match(about, /rel="canonical" href="https:\/\/ysello\.com\/about"/);
  assert.match(about, /<h1>About Ysello<\/h1>/);
  assert.match(about, /<h2>The idea<\/h2>/);
  assert.match(blog, /property="og:type" content="article"/);
  assert.match(blog, /name="twitter:description"/);
  assert.doesNotMatch(about, /localhost|codex-preview/);
});

test("keeps SEO inventory local and preserves explicit private SPA routes", () => {
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  const rewriteSources = vercel.rewrites.map((rule) => rule.source);
  assert.deepEqual(rewriteSources.slice(0, 2), [
    "/api/:path*",
    "/uploads/:path*",
  ]);
  assert.ok(!rewriteSources.includes("/robots.txt"));
  assert.ok(!rewriteSources.includes("/sitemap.xml"));
  assert.ok(!rewriteSources.includes("/catalog"));
  assert.ok(rewriteSources.includes("/dashboard"));
  assert.ok(!rewriteSources.includes("/(.*)"));
  assert.ok(
    vercel.redirects.some(
      (rule) =>
        rule.source === "/products/:slug" &&
        rule.destination === "/product/:slug",
    ),
  );
  assert.ok(
    vercel.redirects.some(
      (rule) =>
        rule.source === "/categories/:slug" &&
        rule.destination === "/category/:slug",
    ),
  );
  assert.ok(
    vercel.headers.some((rule) =>
      rule.headers.some((header) => header.key === "Content-Security-Policy"),
    ),
  );
  assert.ok(
    vercel.headers.some((rule) =>
      rule.headers.some((header) => header.key === "X-Robots-Tag"),
    ),
  );
});

test("provides route recovery and accessible support dialog controls", () => {
  const router = readFileSync("src/WebApp.tsx", "utf8");
  const support = readFileSync("src/components/SupportWidgetPro.tsx", "utf8");
  assert.match(router, /lazy\(\(\) =>\s+import/);
  assert.match(router, /path="\*" element=\{<NotFoundPage \/>\}/);
  assert.match(router, /Skip to main content/);
  assert.match(support, /role="dialog"/);
  assert.match(support, /aria-labelledby="support-dialog-title"/);
  assert.match(support, /aria-label="Send support message"/);
  assert.match(support, /clearTimeout\(guestReplyTimerRef\.current\)/);
});

test("removes abandoned framework, dashboard, and starter assets", () => {
  for (const path of [
    "app/page.tsx",
    "build/sites-vite-plugin.ts",
    "db/schema.ts",
    "drizzle/meta/_journal.json",
    "drizzle.config.ts",
    "examples/d1/db/schema.ts",
    "next.config.ts",
    "public/file.svg",
    "public/globe.svg",
    "src/pages/AdminPanelPage.tsx",
    "src/pages/DashboardPage.tsx",
  ]) {
    assert.equal(
      existsSync(path),
      false,
      `${path} should not remain in the canonical project`,
    );
  }
});

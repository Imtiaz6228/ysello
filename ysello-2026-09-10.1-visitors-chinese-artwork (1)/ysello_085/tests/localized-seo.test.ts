import test from "node:test";
import assert from "node:assert/strict";
import { localizedSeoHtml } from "../src/lib/localized-seo.ts";
import { localizedProduct, uiText } from "../src/i18n/marketplaceCopy.ts";

test("localized HTML preserves product text, canonical pagination and reciprocal language links", () => {
  const input =
    '<html lang="en"><head><title>Accounts</title><link rel="canonical" href="https://ysello.com/category/facebook-accounts" /><meta property="og:locale" content="en_US" /></head><body><h1>Categories</h1><p>Seller&#39;s item &amp; details</p><a href="/product/facebook">Buy now</a><script type="application/ld+json">{"name":"Categories"}</script></body></html>';
  const html = localizedSeoHtml(
    input,
    "/category/facebook?page=3&lang=zh-CN",
    "https://ysello.com",
  );
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<h1>分类<\/h1>/);
  assert.match(html, /facebook-accounts\?page=3&amp;lang=zh-CN/);
  assert.match(html, /hreflang="ru"/);
  assert.match(html, /Seller&#39;s item &amp; details/);
  assert.match(html, /\{"name":"Categories"\}/);
  assert.match(html, /\/product\/facebook\?lang=zh-CN/);
});
test("product locales select stored full titles and preserve original records", () => {
  const product = {
    name: "Original title",
    shortDescription: "Details",
    translations: {
      "zh-CN": { title: "中文商品标题" },
      ru: { title: "Название товара" },
    },
  };
  assert.equal(localizedProduct(product, "zh-CN").name, "中文商品标题");
  assert.equal(localizedProduct(product, "ru").name, "Название товара");
  assert.equal(product.name, "Original title");
  assert.equal(uiText("Supplier imports", "ru"), "Импорт поставщика");
  assert.equal(uiText("Facebook", "zh-CN"), "Facebook");
});

test("default storefront HTML is Chinese and English keeps its explicit URL", () => {
  const template = '<html lang="en"><head><title>Ysello</title><link rel="canonical" href="https://ysello.com/" /></head><body><h1>Browse digital products and expert services</h1><a href="/catalog">Browse all products</a></body></html>';
  const zh = localizedSeoHtml(template, "/", "https://ysello.com");
  assert.match(zh, /lang="zh-CN"/);
  assert.match(zh, /选购数字商品与专业服务/);
  assert.match(zh, /hreflang="en"[^>]*lang=en/);
  const en = localizedSeoHtml(template, "/?lang=en", "https://ysello.com");
  assert.match(en, /<html lang="en">/);
  assert.match(en, /canonical[^>]*lang=en/);
  assert.match(en, /href="\/catalog\?lang=en"/);
});

test("Chinese product fallback translates common attributes without losing brand and quantity", () => {
  const product = localizedProduct({ name: "Instagram Fresh 100 Accounts Japan", translations: { en: { title: "English title" } } }, "zh-CN");
  assert.match(product.name, /Instagram/);
  assert.match(product.name, /100/);
  assert.match(product.name, /账号/);
  assert.match(product.name, /日本/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public language switch offers English, Chinese, and Russian", async () => {
  const locale = await read("src/i18n/LocaleContext.tsx");
  const languageList = locale.slice(
    locale.indexOf("export const languages"),
    locale.indexOf("export const currencies"),
  );
  assert.match(languageList, /code: "en"/);
  assert.match(languageList, /code: "zh-CN"/);
  assert.match(languageList, /code: "ru"/);
  assert.doesNotMatch(languageList, /code: "zh-TW"/);
  assert.doesNotMatch(languageList, /code: "vi"/);
  assert.match(locale, /url\.searchParams\.set\("lang", nextLocale\)/);
});

test("seller listing fields are grouped EN, ZH, RU before localized prices", async () => {
  const [studio, editor, routes] = await Promise.all([
    read("src/pages/SellerStudioPage.tsx"),
    read("src/components/SellerProductEditor.tsx"),
    read("src/routes/seller.routes.ts"),
  ]);

  for (const source of [studio, editor]) {
    const english = source.indexOf("English title");
    const chinese = source.indexOf("中文标题");
    const russian = source.indexOf("Русское название");
    const usd = source.indexOf("USD price ($)");
    const cny = source.indexOf("Chinese yuan price (¥)");
    const rub = source.indexOf("Russian ruble price (₽)");
    assert.ok(english >= 0 && english < chinese && chinese < russian);
    assert.ok(russian < usd && usd < cny && cny < rub);
  }

  assert.match(routes, /"zh-CN": localizedProductCopySchema/);
  assert.match(routes, /ru: localizedProductCopySchema/);
  assert.match(routes, /priceCny/);
  assert.match(routes, /priceRub/);
});

test("product covers are normalized to bounded WebP assets and deal badges are not rendered", async () => {
  const [upload, card, product, storefront] = await Promise.all([
    read("src/middleware/upload.ts"),
    read("src/components/MarketplaceProductCard.tsx"),
    read("src/pages/ProductPage.tsx"),
    read("src/components/YselloReferenceLayout.tsx"),
  ]);

  assert.match(upload, /resize\(\{/);
  assert.match(upload, /width: 1600/);
  assert.match(upload, /height: 1200/);
  assert.match(upload, /\.webp\(\{ quality: 82/);
  for (const source of [card, product, storefront])
    assert.doesNotMatch(source, /\{product\.badge\}/);
});

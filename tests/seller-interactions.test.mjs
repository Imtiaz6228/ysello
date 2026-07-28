import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("seller dashboard cards and revenue periods are interactive", async () => {
  const source = await read("src/pages/SellerStudioPage.tsx");
  assert.match(source, /setAnalyticsPeriod\("7d"\)/);
  assert.match(source, /setAnalyticsPeriod\("30d"\)/);
  assert.match(source, /setAnalyticsPeriod\("year"\)/);
  assert.ok(
    (source.match(/className="seller-metric-action"/g) ?? []).length >= 8,
  );
});

test("seller product list opens a complete product editor", async () => {
  const studio = await read("src/pages/SellerStudioPage.tsx");
  const editor = await read("src/components/SellerProductEditor.tsx");
  assert.match(studio, /setEditingProduct\(product\)/);
  assert.match(studio, /<SellerProductEditor/);
  for (const section of [
    "Basic product details",
    "Multilingual content",
    "Pricing and stock",
    "Product specifications and delivery",
    "Images, gallery, video and inventory",
  ])
    assert.match(editor, new RegExp(section));
  assert.match(editor, /method: "PATCH"/);
  assert.match(editor, /Save changes/);
});

test("new listing flow keeps essentials simple and identity application omits address fields", async () => {
  const studio = await read("src/pages/SellerStudioPage.tsx");
  const application = await read("src/pages/SellerApplicationPage.tsx");
  assert.match(studio, /Multilingual listing and SEO/);
  assert.match(studio, /<details className="seller-create-advanced">/);
  for (const field of [
    "English title",
    "English full description",
    "中文标题",
    "中文完整描述",
    "Русское название",
    "Полное описание",
  ])
    assert.match(studio, new RegExp(field));
  for (const field of [
    "phoneNumber",
    "postalCode",
    "fullAddress",
    "documentNumber",
  ])
    assert.doesNotMatch(application, new RegExp(field));
});

test("marketplace category discovery shows main categories with one focused preview", async () => {
  const source = await read("src/pages/MarketplaceHomePage.tsx");
  assert.match(source, /lux-main-category-row/);
  assert.match(source, /lux-subcategory-preview-grid/);
  assert.match(source, /focusedCategory\.subcategories\.slice\(0, 8\)/);
  assert.match(source, /View all/);
});

test("open dispute chat exposes seller refund, replacement and full order details", async () => {
  const source = await read("src/pages/OrderDeliveryPage.tsx");
  assert.match(source, /user\?\.role === "SELLER" && activeDispute/);
  assert.match(source, /\/api\/seller\/orders\/\$\{order\.id\}\/refund/);
  assert.match(
    source,
    /\/api\/seller\/orders\/\$\{order\.id\}\/items\/\$\{item\.id\}\/replace/,
  );
  for (const label of [
    "Buyer email",
    "Product ID",
    "Quantity bought",
    "Unit price",
    "Order time",
  ])
    assert.match(source, new RegExp(label));
});

test("replacement API requires seller ownership and an active dispute", async () => {
  const source = await read("src/routes/seller.routes.ts");
  assert.match(source, /items\/:itemId\/replace/);
  assert.match(source, /sellerId: req\.auth!\.id/);
  assert.match(source, /ACTIVE_DISPUTE_REQUIRED/);
  assert.match(source, /productInventoryItem\.updateMany/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sale commission uses configured fees and idempotent accounting", async () => {
  const finance = await read("src/services/finance.service.ts");
  const schema = await read("prisma/schema.prisma");
  assert.match(finance, /env\.COMMISSION_SALE_PERCENT/);
  assert.match(finance, /netCents = grossCents - platformFeeCents/);
  assert.match(finance, /paidTotalCents \* item\.totalCents/);
  assert.match(finance, /type_reference/);
  assert.match(schema, /@@unique\(\[type, reference\]\)/);
});

test("buyer commerce actions follow ownership instead of the customer-only role", async () => {
  const dashboard = await read("src/pages/AccountDashboardPage.tsx");
  const commerce = await read("src/routes/commerce.routes.ts");
  assert.doesNotMatch(dashboard, /role === "SELLER"\) return "\/seller"/);
  assert.doesNotMatch(commerce, /orders\/:id\/refunds", requireRole/);
  assert.doesNotMatch(commerce, /orders\/:id\/disputes", requireRole/);
  assert.match(commerce, /buyerId: req\.auth!\.id/);
});

test("top-up UI only renders server-configured destinations", async () => {
  const dashboard = await read("src/pages/AccountDashboardPage.tsx");
  assert.match(dashboard, /const methods = topupMethods\.map/);
  assert.match(dashboard, /No verified payment destination is configured/);
  for (const unsafeAddress of [
    "TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W",
    "1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA",
    "5K8sYDqmmMDeVMDcJjzmwdX2MGMwqCeNNnpDd82tXdf",
  ])
    assert.doesNotMatch(dashboard, new RegExp(unsafeAddress));
});

test("seller cases, reviews, exports, and analytics use real records", async () => {
  const studio = await read("src/pages/SellerStudioPage.tsx");
  const routes = await read("src/routes/seller.routes.ts");
  assert.match(studio, /\/api\/seller\/disputes/);
  assert.match(studio, /\/api\/seller\/reviews/);
  assert.match(studio, /downloadCsv\("seller-orders\.csv"/);
  assert.match(studio, /revenueChart\.values/);
  assert.match(routes, /refunds: \{ orderBy: \{ createdAt: "desc" \} \}/);
});

test("public marketplace presents factual live context and stock-aware purchasing", async () => {
  const home = await read("src/pages/MarketplaceHomePage.tsx");
  const header = await read("src/components/MarketHeader.tsx");
  const storefront = await read("src/storefront-pro.css");
  const refresh = await read("src/marketplace-refresh.css");
  const reference = await read("src/marketplace-reference.css");
  const product = await read("src/pages/ProductPage.tsx");
  assert.match(home, /lux-quick-categories/);
  assert.match(home, /pro-market-hero/);
  assert.ok(home.indexOf('id="categories"') < home.indexOf('id="products"'));
  assert.match(home, /homepage-category-icons/);
  assert.match(home, /marketplace-list/);
  assert.match(header, /commerce-global-search/);
  assert.match(header, /<span>\{t\("categories"\)\}<\/span>/);
  assert.match(header, /g2-mobile-category-panel/);
  assert.match(header, /group\.children\.map/);
  assert.match(refresh, /grid-template-columns: repeat\(5,/);
  assert.match(refresh, /aspect-ratio: 16 \/ 10/);
  assert.match(reference, /grid-template-columns: 82px minmax\(0, 1fr\)/);
  assert.match(storefront, /@media \(max-width: 700px\)/);
  assert.match(storefront, /\.market-product-seller/);
  assert.doesNotMatch(home, /Order delivered[\s\S]{0,80}in 2 minutes/);
  assert.match(product, /const available = product\.type === "SERVICE"/);
  assert.match(product, /product-market-brief/);
  assert.match(product, /product-mobile-purchase/);
});

test("admin product moderation approves listings without a stuck pending state", async () => {
  const routes = await read("src/routes/admin.routes.ts");
  const admin = await read("src/pages/OperationsAdminPage.tsx");
  assert.match(routes, /status: input\.status/);
  assert.match(routes, /Product approved and published/);
  assert.match(routes, /deliveryReady/);
  assert.doesNotMatch(routes, /PRODUCT_DELIVERY_REQUIRED/);
  assert.match(admin, /moderateProduct\(product, "APPROVED"\)/);
  assert.match(admin, /setProducts\(\(current\) =>/);
  assert.match(admin, /productStatusFilter/);
});

test("official admin publishing matches the seller taxonomy and catalog metadata", async () => {
  const routes = await read("src/routes/admin.routes.ts");
  const admin = await read("src/pages/OperationsAdminPage.tsx");

  assert.match(admin, /mergeSellerTaxonomy\(categories\)/);
  assert.match(admin, /categoryPathIds/);
  assert.match(admin, />Account type</);
  assert.match(admin, /adminSocialPlatform/);
  assert.match(admin, /productAttributes/);
  assert.match(admin, /stockQuantity/);
  assert.match(admin, /instantDelivery/);
  assert.match(admin, /manualDelivery/);
  assert.match(admin, /digitalDownload/);

  assert.match(routes, /storeName: "Official"/);
  assert.match(routes, /isOfficial: true/);
  assert.match(routes, /productAttributes: input\.productAttributes/);
  assert.match(routes, /stockQuantity: input\.stockQuantity/);
});

test("premium grids keep store card regions fluid on phones", async () => {
  const premium = await read("src/marketplace-premium-v3.css");

  assert.match(
    premium,
    /\.store-products\.store-products-premium[\s\S]*grid-template-columns: repeat\(4,/,
  );
  assert.match(
    premium,
    /@media \(max-width: 720px\)[\s\S]*grid-template-columns: repeat\(2,/,
  );
  assert.match(
    premium,
    /> \.ys-ref-product-media\.g2-product-media[\s\S]*width: calc\(100% - 20px\) !important;[\s\S]*height: auto !important;/,
  );
  assert.match(
    premium,
    /> \.ys-ref-product-copy\.g2-product-copy[\s\S]*width: 100% !important;[\s\S]*height: auto !important;/,
  );
});

test("product surfaces use responsive icon grids instead of unrelated artwork", async () => {
  const card = await read("src/components/MarketplaceProductCard.tsx");
  const home = await read("src/pages/MarketplaceHomePage.tsx");
  const store = await read("src/pages/StorePage.tsx");
  const product = await read("src/pages/ProductPage.tsx");
  const catalog = await read("src/pages/CatalogPage.tsx");
  const styles = await read("src/product-grid.css");

  for (const source of [card, home, store, product])
    assert.doesNotMatch(source, /marketplaceArtworkFor/);
  assert.doesNotMatch(card, /<img/);
  assert.match(card, /ys-product-glyph/);
  assert.match(card, /disabled=\{!canPurchase\}/);
  assert.match(home, /ys-home-product-identity/);
  assert.match(store, /store-product-icon/);
  assert.match(product, /product-icon-preview/);
  assert.match(catalog, /function CategoryGlyph/);
  assert.doesNotMatch(catalog, /\{parent\.icon\}/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /grid-template-columns: 1fr !important/);
});

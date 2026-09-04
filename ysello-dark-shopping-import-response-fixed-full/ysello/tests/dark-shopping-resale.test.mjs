import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??=
  "postgresql://postgres:password@localhost:5432/ysello";
process.env.APP_URL ??= "http://localhost:5173";
process.env.API_URL ??= "http://localhost:4000";
process.env.JWT_SECRET ??= "j".repeat(40);
process.env.CSRF_SECRET ??= "c".repeat(40);

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Dark Shopping resale applies the locked 30 percent markup before conversion", async () => {
  const { darkShoppingResalePrices } =
    await import("../src/services/dark-shopping-resale.service.ts");

  assert.deepEqual(darkShoppingResalePrices(100), {
    supplierPriceRubCents: 10_000,
    retailPriceRubCents: 13_000,
    retailPriceUsdCents: 143,
    retailPriceCnyCents: 1_036,
    marginPercent: 30,
  });
  assert.equal(
    darkShoppingResalePrices(10.01).retailPriceRubCents,
    1_302,
    "retail rounds upward so fractional kopecks never reduce the margin",
  );
});

test("supplier HTML becomes inert marketplace text", async () => {
  const { darkShoppingPlainText } =
    await import("../src/services/dark-shopping-resale.service.ts");
  const text = darkShoppingPlainText(
    '<p>Safe &amp; clear</p><script>alert("bad")</script><style>bad{}</style><br>Next',
  );

  assert.equal(text, "Safe & clear\n\nNext");
  assert.doesNotMatch(text, /script|alert|style|bad/);
});

test("resale persistence and payment fulfillment are idempotent", async () => {
  const [schema, migration, markupMigration, payment, server, routes] =
    await Promise.all([
      read("prisma/schema.prisma"),
      read("prisma/migrations/202609030001_dark_shopping_resale/migration.sql"),
      read(
        "prisma/migrations/202609040001_dark_shopping_global_markup_30/migration.sql",
      ),
      read("src/services/payment.service.ts"),
      read("src/server.ts"),
      read("src/routes/dark-shopping.routes.ts"),
    ]);

  assert.match(schema, /model DarkShoppingListing/);
  assert.match(schema, /model DarkShoppingFulfillment/);
  assert.match(schema, /idempotenceId\s+String\s+@unique/);
  assert.match(migration, /DarkShoppingFulfillment_idempotenceId_key/);
  assert.match(markupMigration, /SET DEFAULT 30/);
  assert.match(markupMigration, /SET "marginPercent" = 30/);
  assert.match(payment, /fulfillDarkShoppingOrder\(orderId\)/);
  assert.match(payment, /idempotenceId: `ysello-\$\{item\.id\}`/);
  assert.match(payment, /PRODUCT_PRICE_CHANGED/);
  assert.match(payment, /SUPPLIER_COUPON_NOT_ALLOWED/);
  assert.match(payment, /assertDarkShoppingBalance/);
  assert.match(server, /processPendingDarkShoppingFulfillments/);
  assert.match(server, /syncDarkShoppingListings/);
  assert.match(routes, /"\/resale\/categories\/import"/);
  assert.match(routes, /"\/resale\/import"/);
  assert.match(routes, /"\/resale\/sync"/);
});

test("Dark Shopping admin page fails closed instead of crashing on deployment or provider shape drift", async () => {
  const [page, routes, client] = await Promise.all([
    read("src/pages/OperationsAdminPage.tsx"),
    read("src/routes/dark-shopping.routes.ts"),
    read("src/services/dark-shopping.client.ts"),
  ]);

  assert.match(page, /normalizedDarkShoppingResale/);
  assert.match(page, /supplierBalanceLabel/);
  assert.match(page, /Dark Shopping database update required/);
  assert.match(routes, /storage/);
  assert.match(routes, /P2021/);
  assert.match(client, /normalizeProduct/);
  assert.match(client, /finiteNumber/);
  assert.match(client, /normalizeCreatedOrder/);
  assert.match(client, /normalizeOrderStatus/);
  assert.match(page, /Integration \{darkResale\.configuration\.integrationVersion\}/);
});

test("resale deployment defaults to a 30 percent markup and configurable RUB conversion", async () => {
  const [environment, railway, config] = await Promise.all([
    read(".env.example"),
    read(".env.railway.example"),
    read("src/config/env.ts"),
  ]);

  for (const file of [environment, railway]) {
    assert.match(file, /^DARK_SHOPPING_MARGIN_PERCENT=30$/m);
    assert.match(file, /^DARK_SHOPPING_RUB_PER_USD=91\.5$/m);
    assert.match(file, /^DARK_SHOPPING_API_KEY=$/m);
  }
  assert.match(config, /DARK_SHOPPING_RUB_PER_USD/);
});


test("Dark Shopping imports are public storefront listings after admin selection", async () => {
  const [marketplaceRoutes, adminPage, visibilityMigration] = await Promise.all([
    read("src/routes/marketplace.routes.ts"),
    read("src/pages/OperationsAdminPage.tsx"),
    read(
      "prisma/migrations/202609040002_dark_shopping_storefront_visibility/migration.sql",
    ),
  ]);

  assert.match(marketplaceRoutes, /DARK_SHOPPING_CATEGORY_TAG/);
  assert.match(marketplaceRoutes, /metaKeywords: \{ has: DARK_SHOPPING_CATEGORY_TAG \}/);
  assert.match(marketplaceRoutes, /where: publicCategoryPolicyWhere\(\)/);
  assert.match(adminPage, /const \[darkPublish, setDarkPublish\] = useState\(true\)/);
  assert.match(adminPage, /Publish selected products immediately/);
  assert.match(adminPage, /listing\.product\.status === "DRAFT"/);
  assert.match(visibilityMigration, /WHERE "status" = 'DRAFT'/);
  assert.match(visibilityMigration, /"status" = 'APPROVED'/);
  assert.match(visibilityMigration, /"isEnabled" = TRUE/);
});

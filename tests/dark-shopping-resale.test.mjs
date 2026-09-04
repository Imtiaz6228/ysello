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

test("Dark Shopping resale adds the configured 15 percent margin before conversion", async () => {
  const { darkShoppingResalePrices } =
    await import("../src/services/dark-shopping-resale.service.ts");

  assert.deepEqual(darkShoppingResalePrices(100, 15), {
    supplierPriceRubCents: 10_000,
    retailPriceRubCents: 11_500,
    retailPriceUsdCents: 126,
    retailPriceCnyCents: 913,
    marginPercent: 15,
  });
  assert.equal(
    darkShoppingResalePrices(10.01, 15).retailPriceRubCents,
    1_152,
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
  const [schema, migration, payment, server, routes] = await Promise.all([
    read("prisma/schema.prisma"),
    read("prisma/migrations/202609030001_dark_shopping_resale/migration.sql"),
    read("src/services/payment.service.ts"),
    read("src/server.ts"),
    read("src/routes/dark-shopping.routes.ts"),
  ]);

  assert.match(schema, /model DarkShoppingListing/);
  assert.match(schema, /model DarkShoppingFulfillment/);
  assert.match(schema, /idempotenceId\s+String\s+@unique/);
  assert.match(migration, /DarkShoppingFulfillment_idempotenceId_key/);
  assert.match(payment, /fulfillDarkShoppingOrder\(orderId\)/);
  assert.match(payment, /idempotenceId: `ysello-\$\{item\.id\}`/);
  assert.match(payment, /PRODUCT_PRICE_CHANGED/);
  assert.match(payment, /SUPPLIER_COUPON_NOT_ALLOWED/);
  assert.match(payment, /assertDarkShoppingBalance/);
  assert.match(server, /processPendingDarkShoppingFulfillments/);
  assert.match(server, /syncDarkShoppingListings/);
  assert.match(routes, /"\/resale\/import"/);
  assert.match(routes, /"\/resale\/sync"/);
});

test("resale deployment defaults to a 15 percent markup and configurable RUB conversion", async () => {
  const [environment, railway, config] = await Promise.all([
    read(".env.example"),
    read(".env.railway.example"),
    read("src/config/env.ts"),
  ]);

  for (const file of [environment, railway]) {
    assert.match(file, /^DARK_SHOPPING_MARGIN_PERCENT=15$/m);
    assert.match(file, /^DARK_SHOPPING_RUB_PER_USD=91\.5$/m);
    assert.match(file, /^DARK_SHOPPING_API_KEY=$/m);
  }
  assert.match(config, /DARK_SHOPPING_RUB_PER_USD/);
});

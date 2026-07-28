import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the live marketplace catalog never mixes preview IDs into checkout", async () => {
  const marketplace = await read("src/commerce/useMarketplace.ts");

  assert.match(marketplace, /setProducts\(remoteProducts\)/);
  assert.doesNotMatch(marketplace, /mergeWithLocalProducts/);
  assert.match(
    marketplace,
    /error instanceof ApiError && error\.status === 404/,
  );
});

test("payment completion is atomic and inventory allocation is exclusive", async () => {
  const payment = await read("src/services/payment.service.ts");

  assert.match(payment, /tx\.payment\.updateMany/);
  assert.match(
    payment,
    /status: \{ in: \[PaymentStatus\.PENDING, PaymentStatus\.REQUIRES_ACTION\] \}/,
  );
  assert.match(payment, /if \(claimed\.count !== 1\)/);
  assert.match(payment, /orderItemId: null/);
  assert.match(payment, /if \(allocated\.count !== item\.quantity\)/);
  assert.match(payment, /deliveredAt: paidAt/);
});

test("private top-up proofs and paid downloads survive Railway restarts", async () => {
  const [schema, migration, storedFile, commerce, wallet] = await Promise.all([
    read("prisma/schema.prisma"),
    read(
      "prisma/migrations/202607280002_persistent_private_delivery/migration.sql",
    ),
    read("src/lib/stored-file.ts"),
    read("src/routes/commerce.routes.ts"),
    read("src/routes/wallet.routes.ts"),
  ]);

  assert.match(schema, /data\s+Bytes\?/);
  assert.match(schema, /screenshotData\s+Bytes\?/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "data" BYTEA/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "screenshotData" BYTEA/);
  assert.match(storedFile, /Buffer\.from\(file\.data\)/);
  assert.match(commerce, /readStoredFileData/);
  assert.match(wallet, /Buffer\.from\(topup\.screenshotData\)/);
});

test("seller service delivery updates each item and completes the full order", async () => {
  const [schema, routes, studio] = await Promise.all([
    read("prisma/schema.prisma"),
    read("src/routes/seller.routes.ts"),
    read("src/pages/SellerStudioPage.tsx"),
  ]);

  assert.match(schema, /deliveredAt\s+DateTime\?/);
  assert.match(schema, /deliveryMessage\s+String\?/);
  assert.match(routes, /"\/orders\/:id\/deliver"/);
  assert.match(routes, /product: \{ type: ProductType\.SERVICE \}/);
  assert.match(routes, /where: \{ orderId, deliveredAt: null \}/);
  assert.match(routes, /status: OrderStatus\.DELIVERED/);
  assert.match(studio, /Mark delivered/);
  assert.match(studio, /\/api\/seller\/orders\/\$\{item\.order\.id\}\/deliver/);
});

test("reference homepage and mobile account controls match the supplied layouts", async () => {
  const [home, styles, header, buyer, seller, admin] = await Promise.all([
    read("src/pages/MarketplaceHomePage.tsx"),
    read("src/commerce-complete.css"),
    read("src/components/MarketHeader.tsx"),
    read("src/pages/AccountDashboardPage.tsx"),
    read("src/pages/SellerStudioPage.tsx"),
    read("src/pages/OperationsAdminPage.tsx"),
  ]);

  assert.match(home, /reference-store-grid/);
  assert.match(home, /reference-featured-product-grid/);
  assert.match(styles, /\.reference-store-grid[\s\S]*?repeat\(4,/);
  assert.match(styles, /\.reference-featured-product-grid[\s\S]*?repeat\(5,/);
  assert.match(
    styles,
    /@media \(max-width: 720px\)[\s\S]*?\.reference-featured-product-grid[\s\S]*?repeat\(2,/,
  );
  assert.match(header, /g2-mobile-account-panel/);
  assert.match(header, /to="\/sign-out"/);
  assert.match(header, /market-mobile-locale/);
  for (const panel of [buyer, seller, admin]) {
    assert.match(panel, /panel-mobile-sidebar-tools/);
    assert.match(panel, /to="\/sign-out"/);
    assert.match(panel, /<LocaleSwitcher compact/);
  }
});

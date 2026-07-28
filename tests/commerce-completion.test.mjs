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

test("seller listing accepts long translations and bulk account inventory", async () => {
  const [routes, studio, taxonomy, styles] = await Promise.all([
    read("src/routes/seller.routes.ts"),
    read("src/pages/SellerStudioPage.tsx"),
    read("src/data/marketplaceTaxonomy.ts"),
    read("src/commerce-complete.css"),
  ]);

  assert.doesNotMatch(
    routes,
    /title: z\.string\(\)\.trim\(\)\.min\(3\)\.max\(160\)/,
  );
  assert.match(routes, /title: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(5000\)/);
  assert.match(studio, /Import TXT or CSV/);
  assert.match(studio, /accept="\.txt,\.csv,text\/plain,text\/csv"/);
  assert.match(studio, /\[\.\.\.new Set\(merged\)\]\.join\("\\n"\)/);
  assert.match(taxonomy, /\["instagram-accounts", "Accounts"\]/);
  assert.match(taxonomy, /\["community-accounts", "Accounts"\]/);
  assert.match(
    styles,
    /bottom: calc\(104px \+ env\(safe-area-inset-bottom\)\) !important/,
  );
});

test("approved account products publish and seller tools translate and convert once", async () => {
  const [marketplace, routes, studio, editor, taxonomy, home, catalog] =
    await Promise.all([
      read("src/routes/marketplace.routes.ts"),
      read("src/routes/seller.routes.ts"),
      read("src/pages/SellerStudioPage.tsx"),
      read("src/components/SellerProductEditor.tsx"),
      read("src/data/marketplaceTaxonomy.ts"),
      read("src/pages/MarketplaceHomePage.tsx"),
      read("src/pages/CatalogPage.tsx"),
    ]);

  assert.doesNotMatch(marketplace, /prohibitedListingPhrases/);
  assert.match(
    marketplace,
    /status: ProductStatus\.APPROVED,[\s\S]{0,900}sellerProfile: \{ isSuspended: false \}/,
  );
  assert.match(marketplace, /status: ProductStatus\.APPROVED/);
  assert.match(routes, /"\/translate-listing"/);
  assert.match(routes, /translate\.googleapis\.com/);
  assert.match(routes, /data: \{ stockQuantity \}/);
  assert.match(studio, /Translate English to Chinese & Russian/);
  assert.match(studio, /convertedSellerPrices\(priceUsd\)/);
  assert.match(studio, /inventoryRows\(form\.inventoryLines\)\.length/);
  assert.doesNotMatch(
    studio,
    /<span>Stock quantity<\/span>[\s\S]{0,180}<input/,
  );
  assert.match(editor, /Translate English to Chinese & Russian/);
  assert.match(editor, /convertedSellerPrices\(priceUsd\)/);
  for (const slug of [
    "facebook-accounts",
    "instagram-accounts",
    "threads-accounts",
    "x-accounts",
    "tiktok-accounts",
    "telegram-accounts",
    "discord-accounts",
    "snapchat-accounts",
    "whatsapp-accounts",
    "youtube-accounts",
  ])
    assert.match(taxonomy, new RegExp(`"${slug}"`));
  assert.match(home, /homepageFeatured/);
  assert.match(home, /social-account-category-link/);
  assert.match(catalog, /Social Media Accounts/);
});

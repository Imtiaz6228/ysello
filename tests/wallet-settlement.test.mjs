import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("top-ups expose exactly the five configured crypto destinations", async () => {
  const [topup, routes, environment] = await Promise.all([
    read("src/services/topup.service.ts"),
    read("src/routes/wallet.routes.ts"),
    read(".env.example"),
  ]);

  for (const method of [
    "CRYPTO_TRC20",
    "CRYPTO_BEP20",
    "CRYPTO_ERC20",
    "BTC",
    "ETH",
  ]) {
    assert.match(topup, new RegExp(`${method}:`));
    assert.match(routes, new RegExp(`TopupMethod\\.${method}`));
  }

  for (const address of [
    "TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W",
    "0x5fe0bc617b00812396560e00a47b68a4d19933df",
    "1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA",
  ]) {
    assert.match(environment, new RegExp(address));
  }
});

test("top-up proof is unique, private, and credited only by an atomic admin approval", async () => {
  const [schema, migration, topup, walletRoutes, upload] = await Promise.all([
    read("prisma/schema.prisma"),
    read(
      "prisma/migrations/202607280001_wallet_settlement_hardening/migration.sql",
    ),
    read("src/services/topup.service.ts"),
    read("src/routes/wallet.routes.ts"),
    read("src/middleware/upload.ts"),
  ]);

  assert.match(schema, /txHash\s+String\?\s+@unique/);
  assert.match(migration, /TopupRequest_txHash_key/);
  assert.match(topup, /proofSubmittedAt/);
  assert.match(topup, /TXID and screenshot proof are required before approval/);
  assert.match(topup, /topupRequest\.updateMany/);
  assert.match(topup, /balanceCents: \{ increment: topup\.amountCents \}/);
  assert.match(walletRoutes, /topupProofUpload\.single\("screenshot"\)/);
  assert.match(walletRoutes, /proof-image/);
  assert.match(walletRoutes, /staffRoles\.includes/);
  assert.match(upload, /destination: .*privateUploadRoot/);
});

test("buyer funds, seller proceeds, holds, and withdrawals use separate ledgers", async () => {
  const [schema, finance, payment, environment] = await Promise.all([
    read("prisma/schema.prisma"),
    read("src/services/finance.service.ts"),
    read("src/services/payment.service.ts"),
    read(".env.example"),
  ]);

  assert.match(schema, /sellerBalanceCents\s+Int\s+@default\(0\)/);
  assert.match(schema, /enum WalletBalanceKind/);
  assert.match(finance, /env\.FROZEN_HOLD_HOURS/);
  assert.match(finance, /env\.COMMISSION_SALE_PERCENT/);
  assert.match(finance, /sellerBalanceCents: \{ increment:/);
  assert.match(
    finance,
    /sellerBalanceCents: \{ decrement: input\.amountCents \}/,
  );
  assert.match(finance, /status: "FROZEN"/);
  assert.match(payment, /balanceCents: \{ gte: subtotalCents \}/);
  assert.match(payment, /balanceKind: WalletBalanceKind\.BUYER/);
  assert.match(environment, /COMMISSION_SALE_PERCENT=10/);
  assert.match(environment, /FROZEN_HOLD_HOURS=72/);
});

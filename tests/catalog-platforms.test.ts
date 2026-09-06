import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import {
  identifyProductPlatform,
  platformDefinitions,
  platformCategorySlug,
  platformImage,
} from "../src/data/platformIdentity.ts";
import { equivalentCategorySlugs } from "../src/data/categoryAliases.ts";
import { paginationWindow } from "../src/commerce/pagination.ts";
import { paginationItems } from "../src/components/CatalogPagination.tsx";
import { storefrontCategories } from "../src/commerce/storefrontCategories.ts";
import { ProductArtwork } from "../src/components/ProductArtwork.tsx";
import type { CatalogProduct } from "../src/data/catalog.ts";

test("generic supplier Accounts are classified by the actual platform, not included mail", () => {
  for (const [title, expected] of [
    ["Facebook PVA | Gmail included", "facebook"],
    ["Instagram accounts 2FA", "instagram"],
    ["Gmail app passwords", "gmail"],
    ["Telegram USA", "telegram"],
    ["Outlook fresh mailbox", "outlook"],
  ]) {
    const platform = identifyProductPlatform(title, "Accounts");
    assert.equal(platform?.slug, expected);
    assert.equal(platformCategorySlug(platform!), `${expected}-accounts`);
  }
});
test("unrecognized titles remain unclassified rather than being assigned a random platform", () => {
  assert.equal(
    identifyProductPlatform("Premium access package", "Accounts"),
    undefined,
  );
});
test("Facebook and Instagram routes have separate alias groups", () => {
  assert(equivalentCategorySlugs("facebook").has("facebook-accounts"));
  assert(!equivalentCategorySlugs("facebook").has("instagram"));
  assert(
    !equivalentCategorySlugs("instagram-accounts").has("facebook-accounts"),
  );
});
test("server page windows return fifty products and retain products beyond the old 500 cap", () => {
  assert.equal(paginationWindow(623, 11).skip, 500);
  assert.equal(paginationWindow(623, 11).pageSize, 50);
  assert.equal(paginationWindow(623, 99).page, 13);
  assert.equal(paginationWindow(0, 99).page, 1);
  assert.deepEqual(paginationItems(1, 6), [1, 2, 3, 4, 5, 6]);
});
test("every classified platform has a bundled, nonempty SVG image", () => {
  for (const platform of platformDefinitions) {
    const svg = readFileSync(`public${platformImage(platform)}`, "utf8");
    assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(svg, /<path/);
  }
});
test("desktop product markup includes a real logo image even without supplier attributes", () => {
  const product = {
    title: "Facebook PVA accounts | Gmail included",
    category: "Accounts",
    facts: {},
    imageUrl: null,
  } as CatalogProduct;
  const html = renderToStaticMarkup(
    React.createElement(ProductArtwork, { product }),
  );
  assert.match(html, /src="\/brand-icons\/facebook.svg"/);
  assert.match(html, /alt="Facebook logo"/);
});
test("empty legacy categories do not produce navigation links", () => {
  const items = storefrontCategories([
    {
      id: "one",
      slug: "unused",
      name: "Unused",
      description: "",
      icon: "",
      productCount: 0,
    },
    {
      id: "two",
      slug: "facebook-accounts",
      name: "Facebook",
      description: "",
      icon: "",
      productCount: 51,
      isSupplierCategory: true,
    },
  ]);
  assert.deepEqual(
    items.map((item) => item.slug),
    ["facebook-accounts"],
  );
});

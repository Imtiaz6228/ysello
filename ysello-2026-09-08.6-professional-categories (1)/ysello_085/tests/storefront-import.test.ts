import test from "node:test";
import assert from "node:assert/strict";
import { collectSupplierPages } from "../src/commerce/supplierSelection.ts";
import { storefrontCategories } from "../src/commerce/storefrontCategories.ts";
import { categoryPath } from "../src/commerce/marketplaceUrls.ts";

test("selection crosses the supplier 30-item page boundary and removes duplicates", async () => {
  const calls: number[] = [];
  const result = await collectSupplierPages(
    async (page) => {
      calls.push(page);
      return {
        items: Array.from({ length: 30 }, (_, i) => ({
          id: (page - 1) * 29 + i + 1,
        })),
        _meta: { currentPage: page, pageCount: 3 },
      };
    },
    () => {},
  );
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(result.length, 88);
});
test("repeated supplier pages stop with useful error and preserve completed selection", async () => {
  let selected = [] as { id: number }[];
  await assert.rejects(
    collectSupplierPages(
      async () => ({ items: [{ id: 1 }], _meta: { pageCount: 3 } }),
      (items) => {
        selected = items;
      },
    ),
    /repeated page/,
  );
  assert.deepEqual(selected, [{ id: 1 }]);
});
test("network error retains progress for retry", async () => {
  let selected = [] as { id: number }[];
  await assert.rejects(
    collectSupplierPages(
      async (page) => {
        if (page === 2) throw new Error("Provider unavailable");
        return { items: [{ id: 1 }], _meta: { pageCount: 3 } };
      },
      (items) => {
        selected = items;
      },
    ),
    /Provider unavailable/,
  );
  assert.equal(selected.length, 1);
});
test("navigation retains every imported category and its real nested destination", () => {
  const categories = [
    {
      id: "root",
      slug: "accounts",
      name: "Accounts",
      description: "",
      icon: "",
    },
    {
      id: "a",
      slug: "instagram-accounts",
      parentSlug: "accounts",
      name: "Instagram accounts",
      description: "",
      icon: "",
      isSupplierCategory: true,
      productCount: 10,
    },
    {
      id: "b",
      slug: "instagram-business",
      parentSlug: "accounts",
      name: "Instagram business",
      description: "",
      icon: "",
      isSupplierCategory: true,
      productCount: 2,
    },
  ];
  const displayed = storefrontCategories(categories);
  assert.equal(displayed.length, 2);
  assert.equal(
    categoryPath(displayed[1], categories),
    "/category/accounts/instagram-business",
  );
});

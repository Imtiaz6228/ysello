import assert from "node:assert/strict";
import test from "node:test";
import { categoryMatches } from "../src/commerce/catalogHierarchy";
import type { CatalogCategory } from "../src/data/catalog";
import { marketplaceTaxonomy } from "../src/data/marketplaceTaxonomy";

test("social media follows platform, accounts, then account type", () => {
  const social = marketplaceTaxonomy.find(
    (category) => category.slug === "social-media",
  );
  const instagram = social?.subcategories.find(
    (category) => category.name === "Instagram",
  );
  const accounts = instagram?.children?.find(
    (category) => category.name === "Accounts",
  );

  assert.ok(social);
  assert.ok(instagram);
  assert.ok(accounts);
  assert.deepEqual(
    accounts.children?.map((category) => category.name),
    [
      "New accounts",
      "Old accounts",
      "Accounts with followers",
      "Accounts with posts",
    ],
  );
  assert.equal(
    social.subcategories.some((platform) =>
      (platform.children ?? []).some((category) =>
        /template|reel/i.test(category.name),
      ),
    ),
    false,
  );
});

test("account type products match their platform and social account root", () => {
  const categories: CatalogCategory[] = [
    {
      id: "social-media",
      slug: "social-media",
      name: "Social Media Accounts",
      description: "",
      icon: "SOC",
    },
    {
      id: "instagram",
      slug: "instagram-creator-tools",
      parentSlug: "social-media",
      name: "Instagram",
      description: "",
      icon: "SOC",
    },
    {
      id: "instagram-accounts",
      slug: "instagram-accounts",
      parentSlug: "instagram-creator-tools",
      name: "Accounts",
      description: "",
      icon: "SOC",
    },
    {
      id: "instagram-old-accounts",
      slug: "instagram-old-accounts",
      parentSlug: "instagram-accounts",
      name: "Old accounts",
      description: "",
      icon: "SOC",
    },
  ];

  assert.equal(
    categoryMatches(
      "instagram-old-accounts",
      "instagram-creator-tools",
      categories,
    ),
    true,
  );
  assert.equal(
    categoryMatches("instagram-old-accounts", "social-media", categories),
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { discoverCategoryProducts } from "../src/commerce/catalogDiscovery";
import {
  mergeSellerTaxonomy,
  sellerCategorySelection,
} from "../src/commerce/sellerTaxonomy";
import type { CatalogCategory } from "../src/data/catalog";
import { g2aDemoProducts } from "../src/data/g2aDemoCatalog";
import {
  marketplaceTaxonomy,
  marketplaceTaxonomySlugs,
  type MarketplaceTaxonomyNode,
} from "../src/data/marketplaceTaxonomy";

function catalogCategories() {
  const result: CatalogCategory[] = [];
  const append = (
    nodes: MarketplaceTaxonomyNode[],
    parentSlug: string,
    icon: string,
    depth: number,
  ) => {
    nodes.forEach((node) => {
      result.push({
        id: `test-${node.slug}`,
        slug: node.slug,
        parentSlug,
        name: node.name,
        description: node.description,
        icon,
        depth,
      });
      if (node.children) append(node.children, node.slug, icon, depth + 1);
    });
  };
  marketplaceTaxonomy.forEach((root) => {
    result.push({
      id: `test-${root.slug}`,
      slug: root.slug,
      name: root.name,
      description: root.description,
      icon: root.icon,
      depth: 0,
    });
    append(root.subcategories, root.slug, root.icon, 1);
  });
  return result;
}

test("every hamburger category is available in the seller listing flow", () => {
  const remoteRoots = marketplaceTaxonomy.flatMap((root, rootIndex) => [
    {
      id: `remote-root-${rootIndex}`,
      slug: root.slug,
      name: root.name,
      parentId: null,
    },
    ...root.subcategories.map((group, groupIndex) => ({
      id: `remote-group-${rootIndex}-${groupIndex}`,
      slug: group.slug,
      name: group.name,
      parentId: `remote-root-${rootIndex}`,
    })),
  ]);
  const merged = mergeSellerTaxonomy(remoteRoots);
  const slugs = new Set(merged.map((category) => category.slug));

  for (const slug of marketplaceTaxonomySlugs) {
    assert.equal(slugs.has(slug), true, `${slug} should be selectable`);
    const category = merged.find((item) => item.slug === slug);
    assert.ok(category);
    const selection = sellerCategorySelection(category.id, merged);
    assert.ok(selection?.backingId, `${slug} needs a valid backing category`);
    assert.equal(selection?.slug, slug);
    assert.ok(selection?.pathLabel);
  }
});

test("every valid category URL has relevant products instead of an empty page", () => {
  const categories = catalogCategories();
  for (const slug of marketplaceTaxonomySlugs) {
    const discovery = discoverCategoryProducts(
      slug,
      categories,
      g2aDemoProducts,
    );
    assert.ok(
      discovery.products.length > 0,
      `${slug} should show products or related department picks`,
    );
  }
});

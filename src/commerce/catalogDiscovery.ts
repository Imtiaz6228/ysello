import type { CatalogCategory, CatalogProduct } from "../data/catalog";
import { categoryMatches } from "./catalogHierarchy";

function rootForCategory(slug: string, categories: CatalogCategory[]) {
  let current = categories.find((category) => category.slug === slug);
  const visited = new Set<string>();
  while (current?.parentSlug && !visited.has(current.slug)) {
    visited.add(current.slug);
    current =
      categories.find((category) => category.slug === current?.parentSlug) ??
      current;
  }
  return current;
}

function rotateProducts(products: CatalogProduct[], seed: string) {
  if (products.length < 2) return products;
  const offset =
    [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    products.length;
  return [...products.slice(offset), ...products.slice(0, offset)];
}

export function discoverCategoryProducts(
  slug: string,
  categories: CatalogCategory[],
  products: CatalogProduct[],
) {
  const direct = products.filter((product) =>
    categoryMatches(product.categorySlug, slug, categories),
  );
  if (direct.length) return { products: direct, isFallback: false };

  const root = rootForCategory(slug, categories);
  let related = root
    ? products.filter((product) =>
        categoryMatches(product.categorySlug, root.slug, categories),
      )
    : [];

  if (root?.slug === "outlet") {
    related = products.filter(
      (product) =>
        Boolean(product.originalPriceCents) &&
        Number(product.originalPriceCents) > product.priceCents,
    );
  }
  if (!related.length) related = products;

  return {
    products: rotateProducts(related, slug).slice(0, 24),
    isFallback: true,
  };
}

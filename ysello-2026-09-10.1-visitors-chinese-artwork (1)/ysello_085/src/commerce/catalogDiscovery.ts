import type { CatalogCategory, CatalogProduct } from "../data/catalog";
import { categoryMatches } from "./catalogHierarchy";

export function discoverCategoryProducts(
  slug: string,
  categories: CatalogCategory[],
  products: CatalogProduct[],
) {
  const direct = products.filter((product) =>
    categoryMatches(product.categorySlug, slug, categories),
  );
  return { products: direct, isFallback: false };
}

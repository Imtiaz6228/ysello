import type { CatalogCategory } from "../data/catalog";
import { equivalentCategorySlugs } from "../data/categoryAliases";

export function categoryAncestry(slug: string, categories: CatalogCategory[]) {
  const ancestry = new Set<string>([slug]);
  let current = categories.find((category) => category.slug === slug);
  while (current?.parentSlug && !ancestry.has(current.parentSlug)) {
    ancestry.add(current.parentSlug);
    current = categories.find(
      (category) => category.slug === current?.parentSlug,
    );
  }
  return ancestry;
}

export function categoryMatches(
  productCategorySlug: string,
  selectedCategorySlug: string,
  categories: CatalogCategory[],
) {
  if (selectedCategorySlug === "all") return true;
  const productPath = categoryAncestry(productCategorySlug, categories);
  const selectedEquivalents = equivalentCategorySlugs(selectedCategorySlug);
  return [...productPath].some((slug) => selectedEquivalents.has(slug));
}

export function productCategoryBuckets(
  productCategorySlug: string,
  categories: CatalogCategory[],
) {
  const buckets = new Set<string>();
  for (const slug of categoryAncestry(productCategorySlug, categories)) {
    equivalentCategorySlugs(slug).forEach((item) => buckets.add(item));
  }
  return buckets;
}

import type { CatalogCategory, CatalogProduct } from "../data/catalog";

function uniquePath(slugs: Array<string | null | undefined>) {
  return slugs.filter(
    (slug, index, values): slug is string =>
      Boolean(slug) && values.indexOf(slug) === index,
  );
}

export function categoryPath(
  categoryOrSlug: CatalogCategory | string,
  categories: CatalogCategory[] = [],
) {
  const slug =
    typeof categoryOrSlug === "string" ? categoryOrSlug : categoryOrSlug.slug;
  let current =
    typeof categoryOrSlug === "string"
      ? categories.find((category) => category.slug === slug)
      : categoryOrSlug;
  const ancestry: string[] = [];
  const visited = new Set<string>();

  while (current && !visited.has(current.slug)) {
    ancestry.unshift(current.slug);
    visited.add(current.slug);
    current = current.parentSlug
      ? categories.find((category) => category.slug === current?.parentSlug)
      : undefined;
  }

  const compact = uniquePath([
    ancestry[0],
    ancestry[ancestry.length - 1] ?? slug,
  ]);
  return `/category/${compact.join("/")}`;
}

export function productPath(product: CatalogProduct) {
  if (product.seoPath) return product.seoPath;
  return `/product/${uniquePath([
    ...(product.categoryPathSlugs ?? [product.categorySlug]),
    product.slug,
  ]).join("/")}`;
}

export function productCategoryPath(product: CatalogProduct) {
  return `/category/${uniquePath(
    product.categoryPathSlugs ?? [product.categorySlug],
  ).join("/")}`;
}

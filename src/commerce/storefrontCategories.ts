import type { CatalogCategory } from "../data/catalog";
/** Only link to categories with published products; preserve their canonical routes. */
export function storefrontCategories(categories: CatalogCategory[]) {
  return [
    ...new Map(
      categories
        .filter((category) => (category.productCount ?? 0) > 0)
        .map((category) => [category.slug, category]),
    ).values(),
  ].sort(
    (a, b) =>
      Number(Boolean(b.isSupplierCategory)) -
        Number(Boolean(a.isSupplierCategory)) ||
      (b.productCount ?? 0) - (a.productCount ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

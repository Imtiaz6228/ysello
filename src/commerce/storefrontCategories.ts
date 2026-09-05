import type { CatalogCategory } from "../data/catalog";

/** Keep every imported destination intact; never replace its slug with a brand name. */
export function storefrontCategories(categories: CatalogCategory[]) {
  const imported = categories.filter((category) => category.isSupplierCategory);
  const preferred = imported.length
    ? imported
    : categories.filter((category) => category.parentSlug === "social-media");
  return [
    ...new Map(preferred.map((category) => [category.slug, category])).values(),
  ].sort(
    (a, b) =>
      (b.productCount ?? 0) - (a.productCount ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

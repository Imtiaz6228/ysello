import type { CatalogCategory } from "../data/catalog";

/** Categories that contain products directly. Useful for product-level logic. */
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

/**
 * Compact marketplace navigation: show departments and their immediate
 * platforms/subcategories only. Leaf types remain inside category pages.
 */
export function storefrontNavigationCategories(categories: CatalogCategory[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const bySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const children = new Map<string, CatalogCategory[]>();

  for (const category of categories) {
    const parent = category.parentId
      ? byId.get(category.parentId)
      : category.parentSlug
        ? bySlug.get(category.parentSlug)
        : undefined;
    if (!parent) continue;
    children.set(parent.id, [...(children.get(parent.id) ?? []), category]);
  }

  const depthMemo = new Map<string, number>();
  function depthOf(category: CatalogCategory): number {
    const cached = depthMemo.get(category.id);
    if (cached != null) return cached;
    const parent = category.parentId
      ? byId.get(category.parentId)
      : category.parentSlug
        ? bySlug.get(category.parentSlug)
        : undefined;
    const depth = parent ? Math.min(12, depthOf(parent) + 1) : 0;
    depthMemo.set(category.id, depth);
    return depth;
  }

  const countMemo = new Map<string, number>();
  const counting = new Set<string>();
  function countOf(category: CatalogCategory): number {
    const cached = countMemo.get(category.id);
    if (cached != null) return cached;
    if (counting.has(category.id)) return category.productCount ?? 0;
    counting.add(category.id);
    const count =
      (category.productCount ?? 0) +
      (children.get(category.id) ?? []).reduce(
        (total, child) => total + countOf(child),
        0,
      );
    counting.delete(category.id);
    countMemo.set(category.id, count);
    return count;
  }

  return categories
    .map((category) => ({
      ...category,
      depth: category.depth ?? depthOf(category),
      productCount: countOf(category),
    }))
    .filter(
      (category) =>
        (category.productCount ?? 0) > 0 && (category.depth ?? 0) <= 1,
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (a.depth ?? 0) - (b.depth ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

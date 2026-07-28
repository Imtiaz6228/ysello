import {
  marketplaceTaxonomy,
  type MarketplaceTaxonomyNode,
} from "../data/marketplaceTaxonomy";

export type SellerTaxonomyCategory = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  backingId?: string | null;
  isTaxonomyOption?: boolean;
};

const syntheticId = (slug: string) => `taxonomy-${slug}`;

export function mergeSellerTaxonomy<
  T extends SellerTaxonomyCategory,
>(remoteCategories: T[]): Array<T & SellerTaxonomyCategory> {
  const remoteBySlug = new Map(
    remoteCategories
      .filter((category) => category.slug)
      .map((category) => [category.slug!, category]),
  );
  const fallbackBacking =
    remoteCategories.find((category) => !category.parentId)?.id ??
    remoteCategories[0]?.id ??
    null;
  const merged: Array<T & SellerTaxonomyCategory> = [];
  const usedRemoteIds = new Set<string>();

  function appendNode(
    node: MarketplaceTaxonomyNode,
    parentId: string,
    inheritedBackingId: string | null,
  ) {
    const remote = remoteBySlug.get(node.slug);
    const id = remote?.id ?? syntheticId(node.slug);
    const backingId = remote?.id ?? inheritedBackingId ?? fallbackBacking;
    if (remote) usedRemoteIds.add(remote.id);
    merged.push({
      ...(remote ?? ({} as T)),
      id,
      slug: node.slug,
      name: node.name,
      description: node.description,
      parentId,
      backingId,
      isTaxonomyOption: true,
    });
    node.children?.forEach((child) =>
      appendNode(child, id, backingId),
    );
  }

  marketplaceTaxonomy.forEach((root) => {
    const remote = remoteBySlug.get(root.slug);
    const id = remote?.id ?? syntheticId(root.slug);
    const backingId = remote?.id ?? fallbackBacking;
    if (remote) usedRemoteIds.add(remote.id);
    merged.push({
      ...(remote ?? ({} as T)),
      id,
      slug: root.slug,
      name: root.name,
      description: root.description,
      parentId: null,
      backingId,
      isTaxonomyOption: true,
    });
    root.subcategories.forEach((node) => appendNode(node, id, backingId));
  });

  remoteCategories.forEach((category) => {
    if (usedRemoteIds.has(category.id)) return;
    merged.push({
      ...category,
      backingId: category.id,
      isTaxonomyOption: false,
    });
  });

  return merged;
}

export function sellerCategorySelection(
  selectedId: string,
  categories: SellerTaxonomyCategory[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const selected = byId.get(selectedId);
  if (!selected) return null;

  const path: SellerTaxonomyCategory[] = [];
  const visited = new Set<string>();
  let current: SellerTaxonomyCategory | undefined = selected;
  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return {
    selected,
    backingId:
      selected.backingId ??
      (selected.isTaxonomyOption && selected.id.startsWith("taxonomy-")
        ? null
        : selected.id),
    slug: selected.slug ?? "",
    name: selected.name,
    path,
    pathLabel: path.map((category) => category.name).join(" / "),
  };
}

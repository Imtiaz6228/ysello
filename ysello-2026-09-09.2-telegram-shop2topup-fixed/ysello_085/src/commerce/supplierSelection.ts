type SupplierPage<T> = {
  items: T[];
  _meta?: { pageCount?: number; currentPage?: number };
};
export async function collectSupplierPages<T extends { id: number }>(
  fetchPage: (page: number) => Promise<SupplierPage<T>>,
  onProgress: (items: T[], page: number, pages: number) => void,
) {
  const items = new Map<number, T>();
  let pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (page > 500)
      throw new Error(
        "Selection reached 500 pages. Narrow the supplier category or search, then continue.",
      );
    const result = await fetchPage(page);
    pages = Math.max(page, result._meta?.pageCount ?? page);
    if (result._meta?.currentPage && result._meta.currentPage !== page)
      throw new Error(
        "Supplier pagination did not advance. Selection is preserved; retry after refreshing the supplier catalog.",
      );
    const before = items.size;
    result.items.forEach((item) => items.set(item.id, item));
    if (page > 1 && result.items.length && items.size === before)
      throw new Error(
        "Supplier returned a repeated page. Selection is preserved; narrow the search or retry later.",
      );
    onProgress([...items.values()], page, pages);
    if (!result.items.length) break;
  }
  return [...items.values()];
}

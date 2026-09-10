export function paginationWindow(
  total: number,
  requestedPage = 1,
  pageSize = 50,
) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  return { page, pageSize, total, totalPages, skip: (page - 1) * pageSize };
}

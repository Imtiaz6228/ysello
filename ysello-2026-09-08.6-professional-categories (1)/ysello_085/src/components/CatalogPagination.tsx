import { useLocale } from "../i18n/LocaleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function paginationItems(
  page: number,
  totalPages: number,
): Array<number | string> {
  if (totalPages <= 9)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = new Set([1, totalPages]);
  for (
    let i = Math.max(2, page - 2);
    i <= Math.min(totalPages - 1, Math.max(6, page + 2));
    i++
  )
    visible.add(i);
  const result: Array<number | string> = [];
  [...visible]
    .sort((a, b) => a - b)
    .forEach((n, i, list) => {
      if (i && n - list[i - 1] > 1) result.push(`gap-${n}`);
      result.push(n);
    });
  return result;
}
export function CatalogPagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { locale } = useLocale();
  const zh = locale.startsWith("zh");
  const ru = locale === "ru";
  if (!total) return null;
  return (
    <div className="ys-pagination">
      <p>
        {zh ? "显示" : ru ? "Показано" : "Showing"} {(page - 1) * 50 + 1}–
        {Math.min(page * 50, total)} {zh ? "，共" : ru ? "из" : "of"}{" "}
        {total.toLocaleString(locale)}{" "}
        {zh ? "件商品" : ru ? "товаров" : "products"}
      </p>
      <nav aria-label="Product pages">
        <button
          type="button"
          aria-label={
            zh ? "上一页" : ru ? "Предыдущая страница" : "Previous page"
          }
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
        </button>
        {paginationItems(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <button
              type="button"
              key={item}
              aria-label={`${zh ? "页" : ru ? "Страница" : "Page"} ${item}`}
              aria-current={page === item ? "page" : undefined}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item}>…</span>
          ),
        )}
        <button
          type="button"
          aria-label={zh ? "下一页" : ru ? "Следующая страница" : "Next page"}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </button>
      </nav>
    </div>
  );
}

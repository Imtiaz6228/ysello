import { useLocale } from "../i18n/LocaleContext";
import { uiText } from "../i18n/marketplaceCopy";
import { UiText } from "../i18n/UiText";
import { Search, Store, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryPath } from "../commerce/marketplaceUrls";
import { storefrontCategories } from "../commerce/storefrontCategories";
import {
  useMarketplaceCategories,
  useMarketplaceProductPage,
} from "../commerce/useMarketplace";
import { YselloReferenceProductCard } from "./YselloReferenceLayout";
import { CatalogPagination } from "./CatalogPagination";
import { identifyProductPlatform } from "../data/platformIdentity";
import {
  MarketplaceBrandArtwork,
  detectMarketplaceBrandSlug,
} from "./MarketplaceBrandIcon";
import { Seo } from "./Seo";

export function CatalogBrowser({
  categorySlug,
  embedded = false,
}: {
  categorySlug?: string;
  embedded?: boolean;
}) {
  const { locale } = useLocale();
  const local = (en: string, zh: string, ru: string) =>
    locale.startsWith("zh") ? zh : locale === "ru" ? ru : en;
  const categories = useMarketplaceCategories();
  const available = storefrontCategories(categories);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const top = useRef<HTMLElement>(null);
  const selected = categorySlug || params.get("category") || "all";
  const currentCategory = categories.find((item) => item.slug === selected);
  const title =
    currentCategory?.name ||
    identifyProductPlatform(selected)?.name ||
    (selected === "all" ? "All products" : selected.replace(/-/g, " "));
  const [search, setSearch] = useState(params.get("q") || "");
  useEffect(() => setSearch(params.get("q") || ""), [params]);
  const sort = ["popular", "newest", "price_asc", "price_desc"].includes(
    params.get("sort") || "",
  )
    ? params.get("sort")!
    : embedded
      ? "popular"
      : "newest";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const data = useMarketplaceProductPage({
    category: selected,
    q: params.get("q") || "",
    page,
    sort,
    stock: params.get("stock") || "all",
  });
  useEffect(() => {
    if (data.loading || data.error || data.pagination.page === page) return;
    const next = new URLSearchParams(params);
    if (data.pagination.page <= 1) next.delete("page");
    else next.set("page", String(data.pagination.page));
    setParams(next, { replace: true });
  }, [data.error, data.loading, data.pagination.page, page, params, setParams]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("page");
    setParams(next);
  }
  function goPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
    top.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }
  return (
    <section
      className={`ys-catalog-browser ${embedded ? "is-embedded" : ""}`}
      ref={top}
    >
      {!embedded ? (
        <Seo
          title={local(
            `Buy ${title} | Ysello`,
            `${uiText(title, locale)} - 在线选购 | Ysello`,
            `${uiText(title, locale)} — купить | Ysello`,
          )}
          description={local(
            `Browse ${title} on Ysello. Compare stock, prices and delivery terms.`,
            `在 Ysello 选购${uiText(title, locale)}。比较库存、价格和交付条款。`,
            `Выбирайте ${uiText(title, locale)} на Ysello. Сравнивайте наличие, цены и условия доставки.`,
          )}
          canonicalPath={
            categorySlug ? categoryPath(categorySlug, categories) : "/catalog"
          }
        />
      ) : null}
      <header className="ys-catalog-heading">
        <div>
          <span className="ys-eyebrow">
            <UiText value="YSELLO MARKETPLACE" />
          </span>
          <h1>
            <UiText value={embedded ? "Popular products" : title} />
          </h1>
          <p>
            <UiText value={embedded ? "Explore the products buyers choose most across Ysello." : "Choose a platform. Compare the details. Find your next product."} />
          </p>
        </div>
        <span>
          {data.loading
            ? local("Loading catalog…", "正在加载目录…", "Загрузка каталога…")
            : `${data.pagination.total.toLocaleString(locale)} ${local("products", "件商品", "товаров")}`}
        </span>
      </header>
      <div className="ys-catalog-layout">
        {!embedded ? (
          <aside className="ys-catalog-categories">
            <strong>
              <UiText value="Categories" />
            </strong>
            <Link className={selected === "all" ? "active" : ""} to="/catalog">
              <Store />
              <UiText value="All products" />
            </Link>
            {available.map((category) => {
              const brandSlug = detectMarketplaceBrandSlug(
                category.name,
                category.slug,
              );
              return (
                <Link
                  key={category.slug}
                  to={categoryPath(category, categories)}
                  className={selected === category.slug ? "active" : ""}
                >
                  {brandSlug ? (
                    <MarketplaceBrandArtwork brandSlug={brandSlug} className="ys-category-brand-icon" compact />
                  ) : (
                    <Store />
                  )}
                  <span>
                    <UiText value={category.name} />
                  </span>
                  <small>{category.productCount}</small>
                </Link>
              );
            })}
          </aside>
        ) : null}
        <div className="ys-catalog-results">
          <form
            className="ys-catalog-controls"
            onSubmit={(event) => {
              event.preventDefault();
              filter("q", search.trim());
            }}
          >
            <label className="ys-catalog-search">
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={uiText("Search products", locale)}
                aria-label={uiText("Search products", locale)}
              />
              <button type="submit">
                <UiText value="Search" />
              </button>
            </label>
            <label>
              <span className="sr-only">
                <UiText value="Category" />
              </span>
              <select
                value={selected}
                onChange={(event) => {
                  if (categorySlug)
                    navigate(
                      event.target.value === "all"
                        ? "/catalog"
                        : categoryPath(event.target.value, categories),
                    );
                  else filter("category", event.target.value);
                }}
              >
                <option value="all">
                  <UiText value="All categories" />
                </option>
                {currentCategory &&
                !available.some((c) => c.slug === currentCategory.slug) ? (
                  <option value={currentCategory.slug}>
                    <UiText value={currentCategory.name} />
                  </option>
                ) : null}
                {available.map((category) => (
                  <option value={category.slug} key={category.slug}>
                    <UiText value={category.name} />
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">
                <UiText value="Sort products" />
              </span>
              <select
                value={sort}
                onChange={(event) => filter("sort", event.target.value)}
              >
                <option value="newest">
                  <UiText value="Newest first" />
                </option>
                <option value="popular">
                  <UiText value="Most popular" />
                </option>
                <option value="price_asc">
                  <UiText value="Price: low to high" />
                </option>
                <option value="price_desc">
                  <UiText value="Price: high to low" />
                </option>
              </select>
            </label>
            <label className="ys-stock-filter">
              <input
                type="checkbox"
                checked={params.get("stock") === "in_stock"}
                onChange={(event) =>
                  filter("stock", event.target.checked ? "in_stock" : "all")
                }
              />{" "}
              <UiText value="In stock" />
            </label>
          </form>
          <div className="ys-catalog-status" role="status" aria-live="polite">
            {data.loading
              ? local("Loading products…", "正在加载商品…", "Загрузка товаров…")
              : data.error
                ? data.error
                : data.pagination.total
                  ? local(
                      `${data.pagination.total.toLocaleString()} matching products · 50 per page`,
                      `${data.pagination.total.toLocaleString()} 件商品 · 每页 50 件`,
                      `${data.pagination.total.toLocaleString()} товаров · по 50 на странице`,
                    )
                  : local(
                      "No matching products. Try clearing your search or choose another stocked category.",
                      "没有匹配商品。请清除搜索条件或选择其他有货分类。",
                      "Ничего не найдено. Сбросьте поиск или выберите другую категорию.",
                    )}
          </div>
          {!data.loading && !data.error ? (
            <>
              <div className="ys-catalog-product-grid">
                {data.products.map((product) => (
                  <YselloReferenceProductCard
                    key={product.id}
                    product={product}
                    onBuy={(item) => {
                      add(item);
                      navigate("/cart");
                    }}
                  />
                ))}
              </div>
              <CatalogPagination {...data.pagination} onPage={goPage} />
            </>
          ) : null}
          {!data.loading && !data.products.length ? (
            <Link className="ys-catalog-reset" to="/catalog">
              <UiText value="Browse all available products" />
              <ArrowRight />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

import {
  AppWindow,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  Gamepad2,
  Gift,
  Grid2X2,
  List,
  Mail,
  MessageCircle,
  PackageOpen,
  Palette,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryMatches } from "../commerce/catalogHierarchy";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
} from "../commerce/useMarketplace";
import {
  YselloReferenceFooter,
  YselloReferenceHeader,
  YselloReferenceProductCard,
} from "../components/YselloReferenceLayout";
import { Seo } from "../components/Seo";
import type { CatalogCategory, CatalogProduct } from "../data/catalog";

type SortMode = "popular" | "price_asc" | "price_desc" | "newest";
type ViewMode = "grid" | "list";
type ProductKind = "all" | "DOWNLOAD" | "SERVICE";
type PriceBand = "all" | "under_25" | "25_50" | "over_50";

function CategoryGlyph({ slug }: { slug: string }) {
  const key = slug.toLowerCase();
  const Icon =
    key.includes("social") ||
    key.includes("instagram") ||
    key.includes("facebook") ||
    key.includes("tiktok")
      ? Users
      : key.includes("game")
        ? Gamepad2
        : key.includes("ai") || key.includes("productivity")
          ? Bot
          : key.includes("mail") || key.includes("email")
            ? Mail
            : key.includes("design") || key.includes("creative")
              ? Palette
              : key.includes("software") || key.includes("app")
                ? AppWindow
                : key.includes("business")
                  ? BriefcaseBusiness
                  : key.includes("message")
                    ? MessageCircle
                    : PackageOpen;
  return <Icon aria-hidden="true" />;
}

function sortProducts(products: CatalogProduct[], sort: SortMode) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.priceCents - b.priceCents;
    if (sort === "price_desc") return b.priceCents - a.priceCents;
    if (sort === "newest")
      return a.badge === "New"
        ? -1
        : b.badge === "New"
          ? 1
          : b.reviews - a.reviews;
    return b.reviews - a.reviews;
  });
}

function findRoot(
  roots: CatalogCategory[],
  patterns: string[],
  fallback: string,
) {
  return (
    roots.find((item) => {
      const value = `${item.name} ${item.slug}`.toLowerCase();
      return patterns.some((pattern) => value.includes(pattern));
    })?.slug ?? fallback
  );
}

export function CatalogPage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQueryState] = useState(searchParams.get("q") ?? "");
  const [category, setCategoryState] = useState(
    searchParams.get("category") ?? "all",
  );
  const [sort, setSort] = useState<SortMode>("popular");
  const [view, setView] = useState<ViewMode>("grid");
  const [stockOnly, setStockOnly] = useState(false);
  const [kind, setKind] = useState<ProductKind>("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [minimumRating, setMinimumRating] = useState("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const rootCategories = useMemo(
    () => categories.filter((item) => !item.parentSlug && !item.parentId),
    [categories],
  );

  const quickCategories = useMemo(
    () => [
      {
        label: "Social Accounts",
        slug: findRoot(
          rootCategories,
          ["social", "instagram"],
          "social-media-marketplace",
        ),
        icon: Users,
      },
      {
        label: "Gaming",
        slug: findRoot(rootCategories, ["game"], "games"),
        icon: Gamepad2,
      },
      {
        label: "AI Platforms",
        slug: findRoot(rootCategories, ["ai", "productivity"], "ai-platforms"),
        icon: Bot,
      },
      {
        label: "Digital Goods",
        slug: findRoot(
          rootCategories,
          ["subscription", "software", "digital"],
          "subscription-platforms",
        ),
        icon: Gift,
      },
    ],
    [rootCategories],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortProducts(
      products.filter((product) => {
        const inStock =
          product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
        return (
          categoryMatches(product.categorySlug, category, categories) &&
          (!stockOnly || inStock) &&
          (kind === "all" || product.type === kind) &&
          (priceBand === "all" ||
            (priceBand === "under_25" && product.priceCents < 2500) ||
            (priceBand === "25_50" &&
              product.priceCents >= 2500 &&
              product.priceCents <= 5000) ||
            (priceBand === "over_50" && product.priceCents > 5000)) &&
          (minimumRating === "all" ||
            product.rating >= Number(minimumRating)) &&
          (!normalizedQuery ||
            `${product.title} ${product.description} ${product.seller} ${product.category}`
              .toLowerCase()
              .includes(normalizedQuery))
        );
      }),
      sort,
    );
  }, [
    categories,
    category,
    kind,
    minimumRating,
    priceBand,
    products,
    query,
    sort,
    stockOnly,
  ]);

  function updateParam(key: string, value: string, defaultValue = "") {
    const next = new URLSearchParams(searchParams);
    if (value && value !== defaultValue) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function setQuery(value: string) {
    setQueryState(value);
    updateParam("q", value);
  }

  function setCategory(value: string) {
    setCategoryState(value);
    updateParam("category", value, "all");
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStockOnly(false);
    setKind("all");
    setPriceBand("all");
    setMinimumRating("all");
  }

  function buy(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  const activeCategory = categories.find((item) => item.slug === category);
  const activeFilterCount = [
    Boolean(query.trim()),
    category !== "all",
    stockOnly,
    kind !== "all",
    priceBand !== "all",
    minimumRating !== "all",
  ].filter(Boolean).length;

  return (
    <main
      className="ys-ref-page ys-ref-catalog"
      data-legacy-hooks="commerce-page market-browse-page"
    >
      <Seo
        title="Explore the Ysello Marketplace"
        description="Find verified digital products, gaming resources, AI tools and professional services from trusted sellers."
        canonicalPath="/catalog"
      />
      <YselloReferenceHeader />
      <div className="ys-ref-catalog-shell">
        <nav className="ys-ref-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Marketplace</span>
        </nav>
        <section className="ys-ref-catalog-hero">
          <div>
            <h1>Explore the Marketplace</h1>
            <p>Find verified digital products from trusted sellers</p>
          </div>
          <label>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search products"
              placeholder="Search products"
            />
          </label>
        </section>

        <section className="ys-ref-catalog-tabs" aria-label="Quick categories">
          <button
            type="button"
            className={category === "all" ? "active" : ""}
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            <Grid2X2 aria-hidden="true" /> All Products
          </button>
          {quickCategories.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.label}
                className={category === item.slug ? "active" : ""}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                <Icon aria-hidden="true" /> {item.label}
              </button>
            );
          })}
        </section>

        <button
          type="button"
          className="ys-ref-mobile-filter-button"
          aria-expanded={mobileFiltersOpen}
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {activeFilterCount ? <span>{activeFilterCount}</span> : null}
          <ChevronDown aria-hidden="true" />
        </button>

        <section className="ys-ref-market-layout">
          <aside
            className={`ys-ref-filter-panel ${mobileFiltersOpen ? "mobile-open" : ""}`}
          >
            <header>
              <strong>Filters</strong>
              <button type="button" onClick={clearFilters}>
                Clear all
              </button>
            </header>
            <fieldset>
              <legend>Category</legend>
              <label>
                <input
                  type="radio"
                  name="category"
                  checked={category === "all"}
                  onChange={() => setCategory("all")}
                />
                <span>All Categories</span>
                <small>{products.length}</small>
              </label>
              {rootCategories.slice(0, 10).map((item) => (
                <label key={item.slug}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === item.slug}
                    onChange={() => setCategory(item.slug)}
                  />
                  <span>{item.name}</span>
                  <small>
                    {
                      products.filter((product) =>
                        categoryMatches(
                          product.categorySlug,
                          item.slug,
                          categories,
                        ),
                      ).length
                    }
                  </small>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Price Range</legend>
              {[
                ["all", "Any price"],
                ["under_25", "Under $25"],
                ["25_50", "$25 – $50"],
                ["over_50", "Over $50"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="price"
                    checked={priceBand === value}
                    onChange={() => setPriceBand(value as PriceBand)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Delivery</legend>
              <label>
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={(event) => setStockOnly(event.target.checked)}
                />
                <span>
                  <Zap aria-hidden="true" /> Available now
                </span>
              </label>
            </fieldset>
            <fieldset>
              <legend>Product Type</legend>
              <label>
                <input
                  type="radio"
                  name="kind"
                  checked={kind === "all"}
                  onChange={() => setKind("all")}
                />
                <span>All products</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="kind"
                  checked={kind === "DOWNLOAD"}
                  onChange={() => setKind("DOWNLOAD")}
                />
                <span>Instant downloads</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="kind"
                  checked={kind === "SERVICE"}
                  onChange={() => setKind("SERVICE")}
                />
                <span>Seller services</span>
              </label>
            </fieldset>
            <fieldset>
              <legend>Rating</legend>
              {["all", "4.5", "4.8"].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="rating"
                    checked={minimumRating === value}
                    onChange={() => setMinimumRating(value)}
                  />
                  <span>
                    {value === "all" ? (
                      "Any rating"
                    ) : (
                      <>
                        <Star fill="currentColor" aria-hidden="true" /> {value} &
                        up
                      </>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="ys-ref-filter-protection">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Buyer Protection</strong>
                <small>Eligible orders stay protected.</small>
              </span>
            </div>
          </aside>

          <div className="ys-ref-results">
            <div className="ys-ref-results-toolbar">
              <div>
                <strong>{filteredProducts.length.toLocaleString()}</strong>
                <span> listings</span>
              </div>
              <div className="ys-ref-active-filters" role="status">
                {activeCategory ? (
                  <button type="button" onClick={() => setCategory("all")}>
                    {activeCategory.name} ×
                  </button>
                ) : null}
                {query.trim() ? (
                  <button type="button" onClick={() => setQuery("")}>
                    Search: {query.trim()} ×
                  </button>
                ) : null}
                {priceBand !== "all" ? (
                  <button type="button" onClick={() => setPriceBand("all")}>
                    Price filter ×
                  </button>
                ) : null}
                {stockOnly ? (
                  <button type="button" onClick={() => setStockOnly(false)}>
                    Available now ×
                  </button>
                ) : null}
              </div>
              {activeFilterCount ? (
                <button
                  className="ys-ref-reset-link"
                  type="button"
                  onClick={clearFilters}
                >
                  <RotateCcw aria-hidden="true" /> Clear all
                </button>
              ) : null}
              <div className="ys-ref-view-controls">
                <button
                  type="button"
                  className={view === "grid" ? "active" : ""}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <Grid2X2 aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={view === "list" ? "active" : ""}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List aria-hidden="true" />
                </button>
                <label>
                  <span>Sort:</span>
                  <select
                    aria-label="Sort products"
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortMode)
                    }
                  >
                    <option value="popular">Recommended</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>
            </div>

            <div className={`ys-ref-catalog-grid ${view}`}>
              {filteredProducts.map((product) => (
                <YselloReferenceProductCard
                  key={product.id}
                  product={product}
                  layout={view}
                  onBuy={buy}
                />
              ))}
            </div>
            {!filteredProducts.length ? (
              <div className="ys-ref-empty-state">
                <Search aria-hidden="true" />
                <strong>No matching products</strong>
                <span>Try clearing a filter or using a broader search.</span>
                <button type="button" onClick={clearFilters}>
                  Clear all filters
                </button>
              </div>
            ) : null}
            {filteredProducts.length ? (
              <nav className="ys-ref-pagination" aria-label="Pagination">
                <button type="button" disabled>
                  ‹
                </button>
                <button type="button" className="active">
                  1
                </button>
                <button type="button">2</button>
                <button type="button">3</button>
                <span>…</span>
                <button type="button">12</button>
                <button type="button">›</button>
              </nav>
            ) : null}
          </div>
        </section>
      </div>
      <YselloReferenceFooter />
    </main>
  );
}

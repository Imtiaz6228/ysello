import {
  AppWindow,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  Grid2X2,
  List,
  PackageOpen,
  Palette,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryMatches } from "../commerce/catalogHierarchy";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
} from "../commerce/useMarketplace";
import { MarketplacePlatformIcon } from "../components/MarketplaceBrandIcon";
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import type { CatalogCategory, CatalogProduct } from "../data/catalog";
import { marketplaceTaxonomy } from "../data/marketplaceTaxonomy";

type SortMode = "popular" | "rating" | "price_asc" | "price_desc" | "newest";
type ViewMode = "grid" | "list";
type ProductKind = "all" | "DOWNLOAD" | "SERVICE";
type PriceBand = "all" | "under_25" | "25_50" | "over_50";

function productFact(product: CatalogProduct, key: string) {
  const value = product.facts?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function platformBrandSlug(value: string) {
  const key = value.toLowerCase();
  if (key.includes("steam")) return "steam";
  if (key.includes("xbox")) return "xbox";
  if (key.includes("playstation") || key.includes("psn"))
    return "playstation";
  if (key.includes("epic")) return "epic-games";
  if (key.includes("ea app") || key === "ea") return "ea";
  if (key.includes("gog")) return "gog";
  if (key.includes("ubisoft")) return "ubisoft";
  if (key.includes("battle")) return "battle-net";
  if (key.includes("microsoft") || key.includes("windows")) return "windows";
  if (key.includes("apple")) return "apple";
  if (key.includes("android")) return "android";
  if (key.includes("discord")) return "discord";
  return key.replace(/[^a-z0-9]+/g, "-");
}

function CategoryGlyph({ slug }: { slug: string }) {
  const key = slug.toLowerCase();
  const Icon =
    key.includes("ai") || key.includes("workflow")
      ? Bot
      : key.includes("design") || key.includes("creative")
        ? Palette
        : key.includes("software") || key.includes("app")
          ? AppWindow
          : key.includes("business") ||
              key.includes("service") ||
              key.includes("learning")
            ? BriefcaseBusiness
            : PackageOpen;
  return <Icon aria-hidden="true" />;
}

function sortProducts(products: CatalogProduct[], sort: SortMode) {
  return [...products].sort((a, b) => {
    if (sort === "price_asc") return a.priceCents - b.priceCents;
    if (sort === "price_desc") return b.priceCents - a.priceCents;
    if (sort === "rating") return b.rating - a.rating || b.reviews - a.reviews;
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

const socialAccountDepartment = marketplaceTaxonomy.find(
  (item) => item.slug === "social-media",
);

const socialAccountPlatforms = (socialAccountDepartment?.subcategories ?? [])
  .map((platform) => {
    const accounts = platform.children?.find(
      (child) => child.name === "Accounts",
    );
    return {
      ...platform,
      accounts,
      accountTypes: accounts?.children ?? [],
    };
  })
  .filter((platform) => platform.accounts);

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
  const [sort, setSort] = useState<SortMode>(
    (searchParams.get("sort") as SortMode) ?? "popular",
  );
  const [view, setView] = useState<ViewMode>("grid");
  const [stockOnly, setStockOnly] = useState(false);
  const [kind, setKind] = useState<ProductKind>(
    (searchParams.get("kind") as ProductKind) ?? "all",
  );
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [minimumRating, setMinimumRating] = useState("all");
  const [platformFilter, setPlatformFilterState] = useState(
    searchParams.get("platform") ?? "all",
  );
  const [regionFilter, setRegionFilterState] = useState(
    searchParams.get("region") ?? "all",
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [socialPlatformSlug, setSocialPlatformSlug] = useState(
    socialAccountPlatforms[0]?.slug ?? "",
  );
  const requestedMaxPrice = Number(searchParams.get("max"));
  const maxPrice =
    Number.isFinite(requestedMaxPrice) && requestedMaxPrice > 0
      ? requestedMaxPrice
      : 0;

  const rootCategories = useMemo(
    () => categories.filter((item) => !item.parentSlug && !item.parentId),
    [categories],
  );

  const quickCategories = useMemo(
    () =>
      marketplaceTaxonomy.slice(0, 4).map((item) => ({
        label: item.name,
        slug: findRoot(rootCategories, [item.slug, item.name], item.slug),
      })),
    [rootCategories],
  );
  const platformOptions = useMemo(
    () =>
      [...new Set(products.map((product) => productFact(product, "platform")))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const regionOptions = useMemo(
    () =>
      [...new Set(products.map((product) => productFact(product, "region")))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const activeSocialPlatform =
    socialAccountPlatforms.find(
      (platform) => platform.slug === socialPlatformSlug,
    ) ?? socialAccountPlatforms[0];

  useEffect(() => {
    const matchingPlatform = socialAccountPlatforms.find(
      (platform) =>
        platform.slug === category ||
        platform.accounts?.slug === category ||
        platform.accountTypes.some((type) => type.slug === category),
    );
    if (matchingPlatform) setSocialPlatformSlug(matchingPlatform.slug);
  }, [category]);

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
          (!maxPrice || product.priceCents <= maxPrice * 100) &&
          (minimumRating === "all" ||
            product.rating >= Number(minimumRating)) &&
          (platformFilter === "all" ||
            productFact(product, "platform") === platformFilter) &&
          (regionFilter === "all" ||
            productFact(product, "region") === regionFilter) &&
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
    maxPrice,
    minimumRating,
    platformFilter,
    priceBand,
    products,
    query,
    regionFilter,
    sort,
    stockOnly,
  ]);

  useEffect(
    () => setVisibleCount(24),
    [
      category,
      kind,
      maxPrice,
      minimumRating,
      platformFilter,
      priceBand,
      query,
      regionFilter,
      sort,
      stockOnly,
    ],
  );

  const visibleProducts = filteredProducts.slice(0, visibleCount);

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

  function setPlatformFilter(value: string) {
    setPlatformFilterState(value);
    updateParam("platform", value, "all");
  }

  function setRegionFilter(value: string) {
    setRegionFilterState(value);
    updateParam("region", value, "all");
  }

  function clearFilters() {
    setQueryState("");
    setCategoryState("all");
    setStockOnly(false);
    setKind("all");
    setPriceBand("all");
    setMinimumRating("all");
    setPlatformFilterState("all");
    setRegionFilterState("all");
    setSearchParams(new URLSearchParams(), { replace: true });
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
    maxPrice > 0,
    minimumRating !== "all",
    platformFilter !== "all",
    regionFilter !== "all",
  ].filter(Boolean).length;

  return (
    <main
      className="ys-ref-page ys-ref-catalog"
      data-legacy-hooks="commerce-page market-browse-page"
    >
      <Seo
        title="Explore the Ysello Marketplace"
        description="Find licensed digital products, creative assets, AI workflows and professional services from verified sellers."
        canonicalPath="/catalog"
      />
      <MarketHeader />
      <div className="ys-ref-catalog-shell">
        <nav className="ys-ref-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Marketplace</span>
        </nav>
        <section className="ys-ref-catalog-hero">
          <div>
            <h1>Explore the Marketplace</h1>
            <p>
              Find licensed digital goods and professional services from
              verified sellers.
            </p>
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
            return (
              <button
                type="button"
                key={item.label}
                className={category === item.slug ? "active" : ""}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                <CategoryGlyph slug={item.slug} /> {item.label}
              </button>
            );
          })}
        </section>
        <section
          className="ys-ref-social-account-tabs"
          aria-label="Social media account categories"
        >
          <header>
            <span>
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <strong>Social Media Accounts</strong>
              <small>
                Platform <b>→</b> Accounts <b>→</b> Account type
              </small>
            </div>
            <Link to="/category/social-media">View all</Link>
          </header>
          <div className="ys-ref-social-platforms" aria-label="Platforms">
            {socialAccountPlatforms.map((platform) => (
              <button
                type="button"
                key={platform.slug}
                className={socialPlatformSlug === platform.slug ? "active" : ""}
                onClick={() => {
                  setSocialPlatformSlug(platform.slug);
                  setCategory(platform.slug);
                }}
              >
                <b className={`brand-${platform.slug}`}>
                  <MarketplacePlatformIcon slug={platform.slug} />
                </b>
                {platform.name}
              </button>
            ))}
          </div>
          {activeSocialPlatform ? (
            <div className="ys-ref-social-account-types">
              <button
                type="button"
                className={
                  category === activeSocialPlatform.accounts?.slug
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategory(
                    activeSocialPlatform.accounts?.slug ??
                      activeSocialPlatform.slug,
                  )
                }
              >
                All accounts
              </button>
              {activeSocialPlatform.accountTypes.map((type) => (
                <button
                  type="button"
                  key={type.slug}
                  className={category === type.slug ? "active" : ""}
                  onClick={() => setCategory(type.slug)}
                >
                  {type.name}
                </button>
              ))}
            </div>
          ) : null}
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
              {rootCategories.slice(0, 8).map((item) => (
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
              <legend>Platform</legend>
              <label>
                <input
                  type="radio"
                  name="platform"
                  checked={platformFilter === "all"}
                  onChange={() => setPlatformFilter("all")}
                />
                <span>All platforms</span>
                <small>{products.length}</small>
              </label>
              {platformOptions.slice(0, 10).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="platform"
                    checked={platformFilter === option}
                    onChange={() => setPlatformFilter(option)}
                  />
                  <span
                    className={`ys-ref-filter-platform brand-${platformBrandSlug(option)}`}
                  >
                    <MarketplacePlatformIcon
                      slug={platformBrandSlug(option)}
                    />
                    {option}
                  </span>
                  <small>
                    {
                      products.filter(
                        (product) =>
                          productFact(product, "platform") === option,
                      ).length
                    }
                  </small>
                </label>
              ))}
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
              <legend>Region</legend>
              <label>
                <input
                  type="radio"
                  name="region"
                  checked={regionFilter === "all"}
                  onChange={() => setRegionFilter("all")}
                />
                <span>All regions</span>
                <small>{products.length}</small>
              </label>
              {regionOptions.slice(0, 8).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="region"
                    checked={regionFilter === option}
                    onChange={() => setRegionFilter(option)}
                  />
                  <span>{option}</span>
                  <small>
                    {
                      products.filter(
                        (product) => productFact(product, "region") === option,
                      ).length
                    }
                  </small>
                </label>
              ))}
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
                        <Star fill="currentColor" aria-hidden="true" /> {value}{" "}
                        & up
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
                {maxPrice ? (
                  <button type="button" onClick={() => updateParam("max", "")}>
                    Up to ${maxPrice} ×
                  </button>
                ) : null}
                {stockOnly ? (
                  <button type="button" onClick={() => setStockOnly(false)}>
                    Available now ×
                  </button>
                ) : null}
                {platformFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setPlatformFilter("all")}
                  >
                    {platformFilter} ×
                  </button>
                ) : null}
                {regionFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setRegionFilter("all")}
                  >
                    {regionFilter} ×
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
                    <option value="popular">Best Selling</option>
                    <option value="rating">Rating</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>
            </div>

            <div className={`ys-ref-catalog-grid ${view}`}>
              {visibleProducts.map((product) => (
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
            {visibleProducts.length < filteredProducts.length ? (
              <div className="ys-ref-load-more">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 24)}
                >
                  Load more products
                </button>
                <span>
                  Showing {visibleProducts.length} of {filteredProducts.length}
                </span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <MarketFooter />
    </main>
  );
}

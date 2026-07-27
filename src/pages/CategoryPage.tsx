import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Grid2X2,
  List,
  PackageOpen,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryMatches } from "../commerce/catalogHierarchy";
import {
  useMarketplaceCategories,
  useMarketplaceCategory,
  useMarketplaceProducts,
} from "../commerce/useMarketplace";
import {
  YselloReferenceProductCard,
} from "../components/YselloReferenceLayout";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import type { CatalogProduct } from "../data/catalog";
import { NotFoundPage } from "./NotFoundPage";

type SortMode = "popular" | "price_asc" | "price_desc" | "newest";
type ViewMode = "grid" | "list";

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

export function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();
  const { category, loading } = useMarketplaceCategory(slug);
  const [query, setQuery] = useState("");
  const [subFilter, setSubFilter] = useState("all");
  const [kind, setKind] = useState<"all" | "DOWNLOAD" | "SERVICE">("all");
  const [sort, setSort] = useState<SortMode>("popular");
  const [view, setView] = useState<ViewMode>("grid");

  const children = useMemo(
    () => categories.filter((item) => item.parentSlug === slug),
    [categories, slug],
  );
  const siblings = useMemo(
    () =>
      categories
        .filter((item) => !item.parentSlug && !item.parentId && item.slug !== slug)
        .slice(0, 4),
    [categories, slug],
  );
  const categoryProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          slug && categoryMatches(product.categorySlug, slug, categories),
      ),
    [categories, products, slug],
  );
  const filteredProducts = useMemo(() => {
    if (!slug) return [];
    const normalized = query.trim().toLowerCase();
    return sortProducts(
      categoryProducts.filter((product) => {
        const inSubcategory =
          subFilter === "all" ||
          categoryMatches(product.categorySlug, subFilter, categories);
        const matchesKind = kind === "all" || product.type === kind;
        const matchesQuery =
          !normalized ||
          `${product.title} ${product.description} ${product.seller}`
            .toLowerCase()
            .includes(normalized);
        return inSubcategory && matchesKind && matchesQuery;
      }),
      sort,
    );
  }, [categories, categoryProducts, kind, query, slug, sort, subFilter]);

  function buy(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  if (loading)
    return (
      <main className="ys-ref-page" data-legacy-hook="commerce-page">
        <MarketHeader />
        <div className="ys-ref-empty-state">
          <PackageOpen aria-hidden="true" />
          <strong>Loading category…</strong>
        </div>
      </main>
    );
  if (!category || !slug) return <NotFoundPage />;

  const instantCount = categoryProducts.filter(
    (product) => product.type === "DOWNLOAD",
  ).length;

  return (
    <main
      className="ys-ref-page ys-ref-category"
      data-legacy-hooks="commerce-page market-browse-page"
    >
      <Seo
        title={`${category.name} digital products and services`}
        description={category.description}
        canonicalPath={`/categories/${slug}`}
      />
      <MarketHeader />
      <div className="ys-ref-category-shell">
        <nav className="ys-ref-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/catalog">Marketplace</Link>
          <span>/</span>
          <span>{category.name}</span>
        </nav>

        <section className="ys-ref-category-hero">
          <div>
            <span className="ys-ref-eyebrow">
              <Sparkles aria-hidden="true" /> Curated digital department
            </span>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
            <label>
              <Search aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={`Search ${category.name}`}
                placeholder={`Search ${category.name}`}
              />
            </label>
          </div>
          <aside>
            <div>
              <strong>{categoryProducts.length}</strong>
              <span>Verified listings</span>
            </div>
            <div>
              <strong>{children.length}</strong>
              <span>Specialties</span>
            </div>
            <div>
              <strong>{instantCount}</strong>
              <span>Instant products</span>
            </div>
            <ShieldCheck aria-hidden="true" />
          </aside>
        </section>

        {children.length ? (
          <section className="ys-ref-subcategory-grid" aria-label="Specialties">
            {children.slice(0, 8).map((child) => {
              const count = categoryProducts.filter((product) =>
                categoryMatches(product.categorySlug, child.slug, categories),
              ).length;
              return (
                <button
                  type="button"
                  key={child.slug}
                  className={subFilter === child.slug ? "active" : ""}
                  aria-pressed={subFilter === child.slug}
                  onClick={() =>
                    setSubFilter((current) =>
                      current === child.slug ? "all" : child.slug,
                    )
                  }
                >
                  <span>{child.icon || <PackageOpen />}</span>
                  <div>
                    <strong>{child.name}</strong>
                    <small>{child.description}</small>
                    <b>
                      {count} product{count === 1 ? "" : "s"}
                    </b>
                  </div>
                  <ArrowRight aria-hidden="true" />
                </button>
              );
            })}
          </section>
        ) : null}

        <section className="ys-ref-category-assurance">
          <span>
            <BadgeCheck aria-hidden="true" /> Moderated listings
          </span>
          <span>
            <Clock3 aria-hidden="true" /> Delivery shown upfront
          </span>
          <span>
            <ShieldCheck aria-hidden="true" /> Order-linked support
          </span>
        </section>

        <section className="ys-ref-category-products">
          <div className="ys-ref-category-toolbar">
            <div>
              <strong>{filteredProducts.length}</strong>
              <span> product{filteredProducts.length === 1 ? "" : "s"} found</span>
            </div>
            {children.length ? (
              <div className="ys-ref-category-filter-tabs">
                <button
                  type="button"
                  className={subFilter === "all" ? "active" : ""}
                  onClick={() => setSubFilter("all")}
                >
                  All
                </button>
                {children.slice(0, 6).map((child) => (
                  <button
                    type="button"
                    key={child.slug}
                    className={subFilter === child.slug ? "active" : ""}
                    onClick={() => setSubFilter(child.slug)}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="ys-ref-category-controls">
              <label>
                <SlidersHorizontal aria-hidden="true" />
                <select
                  aria-label="Product type"
                  value={kind}
                  onChange={(event) =>
                    setKind(
                      event.target.value as "all" | "DOWNLOAD" | "SERVICE",
                    )
                  }
                >
                  <option value="all">All types</option>
                  <option value="DOWNLOAD">Downloads</option>
                  <option value="SERVICE">Services</option>
                </select>
              </label>
              <label>
                Sort:
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
              <button
                type="button"
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <Grid2X2 aria-hidden="true" />
              </button>
              <button
                type="button"
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List aria-hidden="true" />
              </button>
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
              <span>Try another specialty or a broader search.</span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSubFilter("all");
                  setKind("all");
                }}
              >
                Reset filters
              </button>
            </div>
          ) : null}
        </section>

        {siblings.length ? (
          <section className="ys-ref-section ys-ref-related-categories">
            <div className="ys-ref-section-heading">
              <div>
                <span>Keep exploring</span>
                <h2>Other Categories</h2>
              </div>
              <Link to="/catalog">View all categories</Link>
            </div>
            <div>
              {siblings.map((item) => (
                <Link key={item.slug} to={`/categories/${item.slug}`}>
                  <span>{item.icon || <PackageOpen />}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </div>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="ys-ref-category-cta">
          <div>
            <Zap aria-hidden="true" />
            <span>
              <strong>Can’t find the right product?</strong>
              <small>Browse every department or ask marketplace support.</small>
            </span>
          </div>
          <Link className="ys-ref-primary-button" to="/catalog">
            Explore All Products
          </Link>
        </section>
      </div>
      <MarketFooter />
    </main>
  );
}

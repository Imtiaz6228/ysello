import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gamepad2,
  Gift,
  Headphones,
  LifeBuoy,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
  useMarketplaceStores,
} from "../commerce/useMarketplace";
import {
  YselloReferenceFooter,
  YselloReferenceHeader,
  YselloReferenceProductCard,
} from "../components/YselloReferenceLayout";
import type { CatalogCategory, CatalogProduct } from "../data/catalog";
import { Seo } from "../components/Seo";

type FeaturedCategory = {
  name: string;
  description: string;
  slug: string;
  tone: string;
  icon: typeof Users;
};

const fallbackCategories: FeaturedCategory[] = [
  {
    name: "Social Accounts",
    description: "Social media products, creator tools and growth resources",
    slug: "social-media-marketplace",
    tone: "social",
    icon: Users,
  },
  {
    name: "Gaming",
    description: "Game products, digital assets, coaching and resources",
    slug: "games",
    tone: "gaming",
    icon: Gamepad2,
  },
  {
    name: "AI Platforms",
    description: "AI productivity tools, workflows and creative resources",
    slug: "ai-platforms",
    tone: "ai",
    icon: Bot,
  },
  {
    name: "Digital Goods",
    description: "Software, templates, subscriptions and digital essentials",
    slug: "subscription-platforms",
    tone: "digital",
    icon: Gift,
  },
];

const fallbackStores = [
  { name: "DigitalPro", mark: "DP", rating: 4.9, sales: 1240, slug: "" },
  { name: "GameVault", mark: "GV", rating: 4.8, sales: 980, slug: "" },
  { name: "AI Hub", mark: "AI", rating: 4.9, sales: 870, slug: "" },
  { name: "PremiumStore", mark: "PS", rating: 4.8, sales: 760, slug: "" },
];

function findCategory(
  categories: CatalogCategory[],
  patterns: string[],
  fallback: FeaturedCategory,
) {
  const roots = categories.filter((item) => !item.parentSlug && !item.parentId);
  const match = roots.find((item) => {
    const value = `${item.name} ${item.slug}`.toLowerCase();
    return patterns.some((pattern) => value.includes(pattern));
  });
  return match
    ? { ...fallback, slug: match.slug, description: match.description }
    : fallback;
}

function productBelongsTo(
  product: CatalogProduct,
  category: FeaturedCategory,
) {
  const value = `${product.category} ${product.categorySlug}`.toLowerCase();
  if (category.tone === "social")
    return /social|instagram|tiktok|facebook|twitter|discord|telegram/.test(value);
  if (category.tone === "gaming") return /game|steam|valorant|xbox|playstation/.test(value);
  if (category.tone === "ai") return /ai|chatgpt|midjourney|claude|automation/.test(value);
  return /software|subscription|stream|digital|template|business|design/.test(value);
}

export function MarketplaceHomePage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();
  const stores = useMarketplaceStores();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("social");

  const featuredCategories = useMemo(
    () => [
      findCategory(
        categories,
        ["social", "instagram"],
        fallbackCategories[0],
      ),
      findCategory(categories, ["game"], fallbackCategories[1]),
      findCategory(
        categories,
        ["ai", "artificial", "productivity"],
        fallbackCategories[2],
      ),
      findCategory(
        categories,
        ["subscription", "software", "digital"],
        fallbackCategories[3],
      ),
    ],
    [categories],
  );

  const trendingProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            b.reviews - a.reviews ||
            Number(String(b.sales).replace(/[^0-9.]/g, "")) -
              Number(String(a.sales).replace(/[^0-9.]/g, "")),
        )
        .slice(0, 4),
    [products],
  );

  const activeProducts = useMemo(() => {
    const category =
      featuredCategories.find((item) => item.tone === activeCategory) ??
      featuredCategories[0];
    return products.filter((product) => productBelongsTo(product, category)).slice(0, 5);
  }, [activeCategory, featuredCategories, products]);

  const focusedCategory = useMemo(() => {
    const featured =
      featuredCategories.find((item) => item.tone === activeCategory) ??
      featuredCategories[0];
    return {
      ...featured,
      subcategories: categories.filter(
        (category) =>
          category.parentSlug === featured.slug ||
          category.parentId ===
            categories.find((item) => item.slug === featured.slug)?.id,
      ),
    };
  }, [activeCategory, categories, featuredCategories]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(`/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  }

  function buy(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  const marketplaceStats = [
    { value: "125K+", label: "Happy Customers", icon: Users },
    { value: "250K+", label: "Products Sold", icon: ShoppingBag },
    { value: "8,000+", label: "Verified Sellers", icon: ShieldCheck },
    { value: "4.8/5", label: "Average Rating", icon: Star },
  ];

  return (
    <main
      className="ys-ref-page ys-ref-home"
      data-legacy-hooks="lux-home pro-home commerce-page"
    >
      <Seo
        title="Ysello — Trusted Digital Marketplace"
        description="Buy digital products, gaming resources, AI tools and creator services from verified sellers."
        canonicalPath="/"
      />
      <YselloReferenceHeader />

      <section className="ys-ref-hero" data-legacy-hook="pro-market-hero">
        <div className="ys-ref-hero-copy">
          <span className="ys-ref-eyebrow">
            <ShieldCheck aria-hidden="true" /> Trusted digital marketplace
          </span>
          <h1>
            Everything Digital.
            <br />
            One Trusted Marketplace.
          </h1>
          <p>
            Buy digital products, gaming resources, AI platforms and creator
            tools with clear delivery, verified sellers and protected checkout.
          </p>
          <form className="ys-ref-hero-search" onSubmit={submitSearch}>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search marketplace"
              placeholder="Search accounts, games, AI tools and more"
            />
            <button type="submit">Search Marketplace</button>
          </form>
          <div className="ys-ref-hero-trust">
            <span>
              <ShieldCheck aria-hidden="true" /> Safe & Secure
            </span>
            <span>
              <BadgeCheck aria-hidden="true" /> Verified Sellers
            </span>
            <span>
              <Headphones aria-hidden="true" /> 24/7 Support
            </span>
          </div>
        </div>
        <div className="ys-ref-hero-stage" aria-label="Featured digital categories">
          <div className="ys-ref-hero-platform">
            {featuredCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.name}
                  className={`ys-ref-floating-card tone-${category.tone} card-${index + 1}`}
                  to={`/categories/${category.slug}`}
                >
                  <small>{category.name}</small>
                  <Icon aria-hidden="true" />
                  <strong>
                    {category.tone === "gaming"
                      ? "Level up"
                      : category.tone === "ai"
                        ? "Pro access"
                        : category.tone === "social"
                          ? "Creator ready"
                          : "Instant delivery"}
                  </strong>
                  <span>
                    <BadgeCheck aria-hidden="true" /> Verified
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ys-ref-stats" aria-label="Marketplace statistics">
        {marketplaceStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </span>
            </div>
          );
        })}
      </section>

      <section
        className="ys-ref-section ys-ref-category-section"
        data-legacy-hook="lux-quick-categories"
        id="categories"
      >
        <div className="ys-ref-section-heading">
          <div>
            <span>Explore the marketplace</span>
            <h2>Browse Categories</h2>
          </div>
          <Link to="/catalog">
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div
          className="ys-ref-category-grid homepage-category-icons"
          data-legacy-hook="lux-main-category-row"
        >
          {featuredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.name}
                className={`tone-${category.tone}`}
                to={`/categories/${category.slug}`}
                onFocus={() => setActiveCategory(category.tone)}
                onMouseEnter={() => setActiveCategory(category.tone)}
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <strong>{category.name}</strong>
                  <small>{category.description}</small>
                </div>
                <ChevronRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        {focusedCategory.subcategories.length ? (
          <div className="ys-ref-subcategory-preview">
            <div>
              <span>Featured in {focusedCategory.name}</span>
              <Link to={`/categories/${focusedCategory.slug}`}>
                View all <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div
              className="ys-ref-subcategory-grid"
              data-legacy-hook="lux-subcategory-preview-grid"
            >
              {focusedCategory.subcategories.slice(0, 8).map((subcategory) => (
                <Link key={subcategory.id} to={`/categories/${subcategory.slug}`}>
                  <span>{subcategory.icon || "•"}</span>
                  <strong>{subcategory.name}</strong>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="ys-ref-section ys-ref-products-section" id="products">
        <div className="ys-ref-section-heading">
          <div>
            <span>Popular today</span>
            <h2>Trending Now</h2>
          </div>
          <Link to="/catalog">
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ys-ref-product-grid" data-legacy-hook="marketplace-list">
          {trendingProducts.map((product) => (
            <div className="ys-home-product-identity" key={product.id}>
              <YselloReferenceProductCard product={product} onBuy={buy} />
            </div>
          ))}
        </div>
        {!trendingProducts.length ? (
          <div className="ys-ref-empty-state">
            <PackageCheck aria-hidden="true" />
            <strong>New listings are being prepared.</strong>
            <span>Browse the catalog to see every available product.</span>
          </div>
        ) : null}
      </section>

      <section className="ys-ref-protection-row" aria-label="Marketplace protections">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Buyer Protection</strong>
            <small>Protection on every eligible purchase.</small>
          </span>
        </div>
        <div>
          <BadgeCheck aria-hidden="true" />
          <span>
            <strong>Verified Sellers</strong>
            <small>Seller profiles are reviewed before selling.</small>
          </span>
        </div>
        <div>
          <CreditCard aria-hidden="true" />
          <span>
            <strong>Secure Payments</strong>
            <small>Encrypted checkout through trusted providers.</small>
          </span>
        </div>
      </section>

      <section className="ys-ref-section ys-ref-popular-categories">
        <div className="ys-ref-section-heading">
          <div>
            <span>Curated marketplace</span>
            <h2>Popular Across Every Category</h2>
          </div>
          <Link to="/catalog">View All Products</Link>
        </div>
        <div className="ys-ref-category-tabs" role="tablist">
          {featuredCategories.map((category) => (
            <button
              key={category.tone}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.tone}
              className={activeCategory === category.tone ? "active" : ""}
              onClick={() => setActiveCategory(category.tone)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="ys-ref-popular-list">
          {activeProducts.map((product) => (
            <Link key={product.id} to={`/products/${product.slug}`}>
              <span className={`tone-${activeCategory}`}>{product.icon}</span>
              <strong>{product.title}</strong>
              <small>
                <BadgeCheck aria-hidden="true" /> {product.seller}
              </small>
              <b>${(product.priceCents / 100).toFixed(2)}</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="ys-ref-section ys-ref-how" id="how-it-works">
        <div className="ys-ref-section-heading">
          <div>
            <span>Simple and protected</span>
            <h2>How ysello Works</h2>
          </div>
        </div>
        <div className="ys-ref-how-grid">
          {[
            {
              icon: Search,
              title: "Find the Right Product",
              text: "Browse categories and compare clear seller, delivery and product details.",
            },
            {
              icon: CreditCard,
              title: "Pay Securely",
              text: "Complete checkout through a protected marketplace order.",
            },
            {
              icon: PackageCheck,
              title: "Receive & Confirm",
              text: "Receive your product, confirm delivery and keep support connected.",
            },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <b>{index + 1}</b>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
                {index < 2 ? <ArrowRight aria-hidden="true" /> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="ys-ref-section ys-ref-sellers" id="sellers">
        <div className="ys-ref-section-heading">
          <div>
            <span>Trusted stores</span>
            <h2>Top Verified Sellers</h2>
          </div>
          <Link to="/catalog">View all</Link>
        </div>
        <div className="ys-ref-seller-grid">
          {(stores.length ? stores.slice(0, 4) : fallbackStores).map((store) => (
            <article key={store.name}>
              <div className="ys-ref-seller-avatar">{store.mark}</div>
              <div>
                <strong>
                  {store.name} <BadgeCheck aria-hidden="true" />
                </strong>
                <span>
                  <Star fill="currentColor" aria-hidden="true" />{" "}
                  {store.rating || "New"}
                </span>
                <small>{store.sales.toLocaleString()} sales</small>
              </div>
              <Link to={store.slug ? `/stores/${store.slug}` : "/catalog"}>
                View Store
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="ys-ref-safety">
        <div>
          <span className="ys-ref-eyebrow">Marketplace safety</span>
          <h2>Built for Safe Digital Trading</h2>
          <p>
            Clear listing standards, verified sellers and order-linked support
            create a more confident experience from checkout to delivery.
          </p>
          <ul>
            <li>
              <CheckCircle2 aria-hidden="true" /> Protected order records
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" /> Verified seller profiles
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" /> Dispute resolution support
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" /> Clear delivery terms
            </li>
          </ul>
        </div>
        <div className="ys-ref-security-dashboard">
          <header>
            <span>
              <ShieldCheck aria-hidden="true" /> Security Dashboard
            </span>
            <b>All systems secure</b>
          </header>
          <div>
            <span>
              <small>Transactions</small>
              <strong>250K+</strong>
              <em>This month</em>
            </span>
            <span>
              <small>Success Rate</small>
              <strong>99.8%</strong>
              <em>All time</em>
            </span>
            <span>
              <small>Support</small>
              <strong>24/7</strong>
              <em>Live help</em>
            </span>
          </div>
        </div>
      </section>

      <section className="ys-ref-sell-cta">
        <div>
          <span>Grow your business</span>
          <h2>Sell on ysello</h2>
          <p>
            Reach digital buyers, manage trusted listings and grow your store
            with a professional seller workspace.
          </p>
          <Link className="ys-ref-primary-button" to="/seller/apply">
            Start Selling
          </Link>
        </div>
        <div className="ys-ref-seller-dashboard">
          <header>
            <strong>Seller Dashboard</strong>
            <span>Welcome back</span>
          </header>
          <div>
            <span>
              <small>Total Sales</small>
              <strong>$12,450</strong>
            </span>
            <span>
              <small>Orders</small>
              <strong>1,245</strong>
            </span>
            <span>
              <small>Rating</small>
              <strong>4.9/5</strong>
            </span>
          </div>
          <div className="ys-ref-chart">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      <section className="ys-ref-section ys-ref-testimonials">
        <div className="ys-ref-section-heading">
          <div>
            <span>Marketplace community</span>
            <h2>Loved by Digital Buyers</h2>
          </div>
        </div>
        <div>
          {[
            [
              "AR",
              "Alex R.",
              "Fast delivery and clear product details. Everything worked exactly as described.",
            ],
            [
              "MK",
              "Mia K.",
              "The seller was responsive and the protected order process felt simple and safe.",
            ],
            [
              "DL",
              "David L.",
              "A clean marketplace with useful categories, clear prices and reliable support.",
            ],
          ].map(([initials, name, quote]) => (
            <article key={name}>
              <span>{initials}</span>
              <strong>{name}</strong>
              <div aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} fill="currentColor" aria-hidden="true" />
                ))}
              </div>
              <p>“{quote}”</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ys-ref-section ys-ref-faq">
        <div className="ys-ref-section-heading">
          <div>
            <span>Helpful answers</span>
            <h2>Frequently Asked Questions</h2>
          </div>
        </div>
        <div>
          {[
            [
              "Is it safe to buy from ysello.com?",
              "Eligible orders include clear seller, delivery and dispute records so support stays connected to your purchase.",
            ],
            [
              "How does digital delivery work?",
              "Each listing explains the delivery method and timing before checkout.",
            ],
            [
              "What payment methods are accepted?",
              "Available payment methods are shown securely during checkout.",
            ],
            [
              "Can I request support after purchase?",
              "Yes. Support remains linked to the order in your buyer dashboard.",
            ],
            [
              "How do I become a verified seller?",
              "Submit a seller application and complete the marketplace review process.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ys-ref-final-cta">
        <Sparkles aria-hidden="true" />
        <div>
          <h2>Ready to Find Your Next Digital Product?</h2>
          <p>Browse verified listings across every category.</p>
        </div>
        <Link className="ys-ref-primary-button" to="/catalog">
          Search Marketplace
        </Link>
      </section>

      <YselloReferenceFooter />
    </main>
  );
}

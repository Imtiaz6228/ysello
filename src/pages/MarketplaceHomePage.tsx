import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  Gamepad2,
  Gift,
  Headphones,
  Eye,
  Layers3,
  Mail,
  MonitorDown,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  UsersRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryMatches } from "../commerce/catalogHierarchy";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
  useMarketplaceStores,
  type FeaturedStore,
} from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import {
  flattenedTaxonomyNodes,
  marketplaceTaxonomy,
  type MarketplaceTaxonomyItem,
} from "../data/marketplaceTaxonomy";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";

const categoryIcons: Record<string, LucideIcon> = {
  gaming: Gamepad2,
  software: MonitorDown,
  subscriptions: RefreshCw,
  "gift-cards": Gift,
  "social-media": UsersRound,
  outlet: Tags,
};

const categoryArt: Record<string, string> = {
  gaming: "/marketplace-assets/hero-marketplace.webp",
  software: "/editorial/creator-studio.webp",
  subscriptions: "/marketplace-assets/buyer-protection.webp",
  "gift-cards": "/category-art/business.webp",
  "social-media": "/editorial/color-shapes.webp",
  outlet: "/marketplace-assets/seller-growth.webp",
};

const serviceHighlights = [
  "Brand identity",
  "Website setup",
  "AI workflow setup",
  "Video editing",
  "Presentation design",
  "SEO & content",
];

const budgetOptions = [
  { max: 10, label: "UP TO", value: "$10" },
  { max: 25, label: "UP TO", value: "$25" },
  { max: 50, label: "UP TO", value: "$50" },
  { max: 100, label: "UP TO", value: "$100" },
];

const faqs = [
  {
    question: "How are digital products delivered?",
    answer:
      "Every listing shows its delivery method before checkout. Instant downloads appear in your buyer dashboard after confirmed payment, while seller-delivered work remains connected to the order.",
  },
  {
    question: "How does Ysello verify marketplace sellers?",
    answer:
      "Public products can only be published by approved seller profiles. The storefront displays the seller and listing information supplied by the live marketplace record.",
  },
  {
    question: "What can sellers upload?",
    answer:
      "Ysello supports legitimate digital downloads and well-scoped professional services. Accounts, credentials, unauthorized keys, fake engagement and other prohibited products are not allowed.",
  },
  {
    question: "Where do I get help with an order?",
    answer:
      "Open the order in your dashboard to contact support with the relevant product and delivery details already attached.",
  },
];

function salesNumber(product: CatalogProduct) {
  const value = String(product.sales).toLowerCase().replace(/,/g, "").trim();
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  if (value.endsWith("k")) return parsed * 1_000;
  if (value.endsWith("m")) return parsed * 1_000_000;
  return parsed;
}

function categoryCount(
  taxonomy: MarketplaceTaxonomyItem,
  categories: ReturnType<typeof useMarketplaceCategories>,
) {
  const acceptedSlugs = new Set([
    taxonomy.slug,
    ...flattenedTaxonomyNodes(taxonomy).map((item) => item.slug),
  ]);
  return categories
    .filter(
      (category) =>
        acceptedSlugs.has(category.slug) ||
        acceptedSlugs.has(category.parentSlug ?? ""),
    )
    .reduce((total, category) => total + (category.productCount ?? 0), 0);
}

function mergeProductPicks(
  preferred: CatalogProduct[],
  fallback: CatalogProduct[],
  limit = 12,
) {
  const merged = new Map<string, CatalogProduct>();
  [...preferred, ...fallback].forEach((product) => {
    if (merged.size < limit) merged.set(product.id, product);
  });
  return [...merged.values()];
}

function SectionHeading({
  title,
  text,
  href,
  action = "Discover all",
}: {
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="market-section-heading g2-section-heading">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {href ? (
        <Link to={href}>
          {action} <ArrowRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function ProductRail({
  products,
  emptyTitle,
  onBuy,
}: {
  products: CatalogProduct[];
  emptyTitle: string;
  onBuy: (product: CatalogProduct) => void;
}) {
  if (!products.length) {
    return (
      <div className="g2-empty-rail">
        <Layers3 aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <span>Approved listings will appear here automatically.</span>
        <Link to="/catalog">Browse marketplace</Link>
      </div>
    );
  }

  return (
    <div className="market-product-grid marketplace-list ys-home-product-identity g2-product-rail">
      {products.map((product) => (
        <YselloReferenceProductCard
          key={product.id}
          product={product}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}

function storeFallbacks(products: CatalogProduct[]): FeaturedStore[] {
  const stores = new Map<string, FeaturedStore>();
  products.forEach((product) => {
    const slug =
      product.sellerSlug ||
      product.seller
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!slug || stores.has(slug)) return;
    stores.set(slug, {
      name: product.seller,
      slug,
      about:
        "Verified digital products with clear delivery terms and order-linked buyer support.",
      rating: product.rating,
      sales: salesNumber(product),
      joined: "2026",
      mark: product.seller
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
  });
  return [...stores.values()];
}

function TopStoreCard({ store }: { store: FeaturedStore }) {
  return (
    <article className="reference-store-card">
      <div className="reference-store-profile">
        <span className="reference-store-logo">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={`${store.name} logo`}
              loading="lazy"
              decoding="async"
              width="96"
              height="96"
            />
          ) : (
            <b>{store.mark}</b>
          )}
        </span>
        <div>
          <h3>
            <Link to={`/stores/${store.slug}`}>{store.name}</Link>
            <span>
              <BadgeCheck aria-hidden="true" /> VERIFIED
            </span>
          </h3>
          <p>{store.about}</p>
        </div>
      </div>
      <Link className="reference-store-visit" to={`/stores/${store.slug}`}>
        Visit Store <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

function FeaturedProductCard({
  product,
  onBuy,
}: {
  product: CatalogProduct;
  onBuy: (product: CatalogProduct) => void;
}) {
  const { formatProductMoney } = useLocale();
  const canPurchase =
    product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
  const stockLabel =
    product.type === "SERVICE"
      ? "Available"
      : `${Math.max(0, product.stockCount ?? 0)} left`;

  return (
    <article className="reference-featured-product-card">
      <div className="reference-featured-product-media">
        <span>{stockLabel}</span>
        <Link to={`/product/${product.slug}`} aria-label={product.title}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              decoding="async"
              width="520"
              height="390"
            />
          ) : (
            <b className="reference-product-fallback">{product.icon}</b>
          )}
        </Link>
      </div>
      <div className="reference-featured-product-copy">
        <Link to={`/product/${product.slug}`}>{product.title}</Link>
        <strong>{formatProductMoney(product)}</strong>
        <footer>
          <Link to={`/product/${product.slug}`}>
            <Eye aria-hidden="true" /> View
          </Link>
          <button
            type="button"
            disabled={!canPurchase}
            onClick={() => onBuy(product)}
            aria-label={
              canPurchase
                ? `Add ${product.title} to cart`
                : `${product.title} is unavailable`
            }
          >
            <ShoppingCart aria-hidden="true" />
          </button>
        </footer>
      </div>
    </article>
  );
}

export function MarketplaceHomePage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const { formatMoney, formatProductMoney, t } = useLocale();
  const products = useMarketplaceProducts();
  const remoteStores = useMarketplaceStores();
  const categories = useMarketplaceCategories();
  const [email, setEmail] = useState("");
  const [newsletterState, setNewsletterState] = useState<
    "idle" | "error" | "success"
  >("idle");
  const [focusedCategorySlug, setFocusedCategorySlug] = useState(
    marketplaceTaxonomy[0].slug,
  );
  const focusedCategory =
    marketplaceTaxonomy.find(
      (category) => category.slug === focusedCategorySlug,
    ) ?? marketplaceTaxonomy[0];

  const bestSellers = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            salesNumber(b) - salesNumber(a) ||
            b.rating - a.rating ||
            b.reviews - a.reviews,
        )
        .slice(0, 12),
    [products],
  );

  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) =>
          String(b.publishedAt ?? b.id).localeCompare(
            String(a.publishedAt ?? a.id),
          ),
        )
        .slice(0, 12),
    [products],
  );

  const services = useMemo(
    () => products.filter((product) => product.type === "SERVICE").slice(0, 12),
    [products],
  );

  const instantDownloads = useMemo(
    () =>
      mergeProductPicks(
        bestSellers.filter((product) => product.type === "DOWNLOAD"),
        newArrivals.filter((product) => product.type === "DOWNLOAD"),
      ),
    [bestSellers, newArrivals],
  );

  const creativePicks = useMemo(
    () =>
      mergeProductPicks(
        products.filter(
          (product) =>
            categoryMatches(
              product.categorySlug,
              "creative-software",
              categories,
            ) ||
            categoryMatches(product.categorySlug, "social-media", categories),
        ),
        bestSellers,
      ),
    [bestSellers, categories, products],
  );

  const workPicks = useMemo(
    () =>
      mergeProductPicks(
        products.filter(
          (product) =>
            categoryMatches(product.categorySlug, "software", categories) ||
            categoryMatches(
              product.categorySlug,
              "subscriptions",
              categories,
            ) ||
            categoryMatches(product.categorySlug, "gift-cards", categories),
        ),
        newArrivals,
      ),
    [categories, newArrivals, products],
  );

  const mobileHighlights = useMemo(() => {
    const preferredSlugs = [
      "halo-infinite-campaign-pc",
      "steam-wallet-20",
      "razer-gold-10",
    ];
    const preferred = preferredSlugs
      .map((slug) => products.find((product) => product.slug === slug))
      .filter((product): product is CatalogProduct => Boolean(product));
    return mergeProductPicks(preferred, bestSellers, 3);
  }, [bestSellers, products]);

  const bundleProducts = bestSellers.slice(0, 3);
  const bundleTotal = bundleProducts.reduce(
    (total, product) => total + product.priceCents,
    0,
  );
  const featuredStores = useMemo(() => {
    const merged = new Map<string, FeaturedStore>();
    [...remoteStores, ...storeFallbacks(products)].forEach((store) => {
      if (merged.size < 12 && !merged.has(store.slug)) {
        merged.set(store.slug, store);
      }
    });
    return [...merged.values()];
  }, [products, remoteStores]);

  function buy(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  function buyBundle() {
    bundleProducts.forEach((product) => add(product));
    navigate("/cart");
  }

  function subscribe(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNewsletterState("error");
      return;
    }
    setNewsletterState("success");
  }

  return (
    <main className="market-home-page g2-home-page">
      <Seo
        title={`Ysello — ${t("homeHeroTitle")}`}
        description={t("homeHeroIntro")}
        canonicalPath="/"
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ysello",
            url: "https://ysello.com",
            logo: "https://ysello.com/ysello-mark.svg",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Ysello",
            url: "https://ysello.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://ysello.com/catalog?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <MarketHeader />

      <section
        className="g2-mobile-feature-stack"
        aria-label="Marketplace bestsellers"
      >
        {mobileHighlights.map((product) => {
          const platform =
            typeof product.facts?.platform === "string"
              ? product.facts.platform
              : product.type === "SERVICE"
                ? "Seller service"
                : "Digital product";
          const region =
            typeof product.facts?.region === "string"
              ? product.facts.region
              : "GLOBAL";
          return (
            <Link key={product.id} to={`/product/${product.slug}`}>
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="640"
                  height="480"
                />
              ) : null}
              <span>
                <strong>{product.title}</strong>
                <small>
                  {platform} · {product.type === "SERVICE" ? "Service" : "Key"}{" "}
                  · {region}
                </small>
              </span>
            </Link>
          );
        })}
      </section>

      <section
        className="market-home-hero pro-market-hero g2-home-hero"
        aria-labelledby="marketplace-hero-title"
      >
        <div className="g2-hero-intro">
          <span>
            <Zap aria-hidden="true" /> YSELLO SELECTS
          </span>
          <h1 id="marketplace-hero-title">{t("homeHeroTitle")}</h1>
          <p>{t("homeHeroIntro")}</p>
          <div>
            <Link to="/catalog">
              {t("shopMarketplace")} <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/seller/apply">{t("startSelling")}</Link>
          </div>
        </div>
        <div className="g2-hero-proof" aria-label="Marketplace benefits">
          <span>
            <BadgeCheck aria-hidden="true" /> {t("verifiedSellers")}
          </span>
          <span>
            <Download aria-hidden="true" /> {t("fastDelivery")}
          </span>
          <span>
            <ShieldCheck aria-hidden="true" /> {t("protectedCheckout")}
          </span>
        </div>
      </section>

      <section
        className="market-home-section g2-category-dock-section"
        id="categories"
      >
        <div className="market-category-grid lux-quick-categories lux-main-category-row homepage-category-icons g2-category-dock">
          {marketplaceTaxonomy.map((category) => {
            const Icon = categoryIcons[category.slug] ?? Layers3;
            const count = categoryCount(category, categories);
            return (
              <Link
                key={category.slug}
                to={`/category/${category.slug}`}
                className={`market-category-card tone-${category.accent}`}
                onFocus={() => setFocusedCategorySlug(category.slug)}
                onMouseEnter={() => setFocusedCategorySlug(category.slug)}
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <strong>{category.name}</strong>
                <small>
                  {count
                    ? `${count.toLocaleString()} live`
                    : t("exploreDepartment")}
                </small>
              </Link>
            );
          })}
        </div>

        <div
          className="market-subcategory-preview lux-subcategory-preview-grid g2-subcategory-preview"
          aria-label={`${focusedCategory.name} specialties`}
        >
          <strong>{focusedCategory.name}</strong>
          {focusedCategory.subcategories.slice(0, 8).map((subcategory) => (
            <Link key={subcategory.slug} to={`/category/${subcategory.slug}`}>
              {subcategory.name}
            </Link>
          ))}
          <Link to={`/category/${focusedCategory.slug}`}>
            {t("viewAll")} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="market-home-section g2-home-section reference-top-stores"
        id="top-stores"
      >
        <SectionHeading
          title="Top Stores"
          text="Shop verified storefronts with clear delivery and protected order support."
          href="/catalog?sort=popular"
          action="Browse marketplace"
        />
        <div className="reference-store-grid">
          {featuredStores.slice(0, 12).map((store) => (
            <TopStoreCard key={store.slug} store={store} />
          ))}
        </div>
      </section>

      <section
        className="market-home-section g2-home-section reference-featured-products"
        id="products"
      >
        <SectionHeading
          title="Featured Products"
          text="The marketplace products buyers are choosing right now."
          href="/catalog?sort=popular"
        />
        {bestSellers.length ? (
          <div className="reference-featured-product-grid">
            {bestSellers.slice(0, 10).map((product) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                onBuy={buy}
              />
            ))}
          </div>
        ) : (
          <div className="g2-empty-rail">
            <Layers3 aria-hidden="true" />
            <strong>No featured products yet.</strong>
            <span>Approved listings will appear here automatically.</span>
            <Link to="/catalog">Browse marketplace</Link>
          </div>
        )}
      </section>

      {bundleProducts.length === 3 ? (
        <section className="market-home-section g2-home-section g2-bundle-section">
          <SectionHeading
            title="Better together"
            text="A ready-made bundle assembled from current marketplace favorites."
          />
          <div className="g2-bundle">
            <div className="g2-bundle-items">
              {bundleProducts.map((product, index) => (
                <div key={product.id} className="g2-bundle-item">
                  {index ? <b aria-hidden="true">+</b> : null}
                  <Link to={`/product/${product.slug}`}>
                    <span>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width="320"
                          height="240"
                        />
                      ) : (
                        <i>{product.icon}</i>
                      )}
                    </span>
                    <div>
                      <small>{product.seller}</small>
                      <strong>{product.title}</strong>
                      <em>{formatProductMoney(product)}</em>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            <aside>
              <span>3-product bundle</span>
              <strong>{formatMoney(bundleTotal)}</strong>
              <small>Individual product prices combined</small>
              <button type="button" onClick={buyBundle}>
                <ShoppingCart aria-hidden="true" /> Add bundle to cart
              </button>
              <Link to="/cart">Bundle details</Link>
            </aside>
          </div>
        </section>
      ) : null}

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="What’s your budget?"
          text="Start with a price point and see what fits."
        />
        <div className="g2-budget-grid">
          {budgetOptions.map((option, index) => (
            <Link
              key={option.max}
              className={`budget-${index + 1}`}
              to={`/catalog?max=${option.max}&sort=price_asc`}
            >
              <span>{option.label}</span>
              <strong>{option.value}</strong>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="Pick a category"
          text="Jump into a curated department."
          href="/catalog"
          action="View all categories"
        />
        <div className="g2-category-art-grid">
          {marketplaceTaxonomy.slice(0, 4).map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`}>
              <span>
                <img
                  src={categoryArt[category.slug]}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="640"
                  height="480"
                />
              </span>
              <strong>{category.name}</strong>
              <small>
                {category.subcategories.map((item) => item.name).join(" · ")}
              </small>
            </Link>
          ))}
        </div>
      </section>

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="New on Ysello"
          text="Recently published digital products and services."
          href="/catalog?sort=newest"
        />
        <ProductRail
          products={newArrivals.slice(0, 6)}
          emptyTitle="No new products yet."
          onBuy={buy}
        />
      </section>

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="Instant downloads"
          text="Ready-to-use files, templates and tools delivered directly to your account."
          href="/catalog?kind=DOWNLOAD&sort=popular"
        />
        <ProductRail
          products={instantDownloads.slice(0, 6)}
          emptyTitle="No instant downloads are published yet."
          onBuy={buy}
        />
      </section>

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="Creative studio picks"
          text="Design systems, web assets, motion packs and creator resources."
          href="/category/creative-software"
        />
        <ProductRail
          products={creativePicks.slice(0, 6)}
          emptyTitle="No creative products are published yet."
          onBuy={buy}
        />
      </section>

      <section className="market-home-section g2-home-section">
        <SectionHeading
          title="Tools for work and business"
          text="Productivity systems, commercial templates and specialist learning resources."
          href="/category/software"
        />
        <ProductRail
          products={workPicks.slice(0, 6)}
          emptyTitle="No business tools are published yet."
          onBuy={buy}
        />
      </section>

      <section
        className="market-home-section g2-home-section"
        id="professional-services"
      >
        <SectionHeading
          title="Professional services"
          text="Book verified specialists with scope, price and delivery visible upfront."
          href="/catalog?kind=SERVICE"
          action="Discover all services"
        />
        <div className="market-service-chips g2-service-chips">
          {serviceHighlights.map((service) => (
            <span key={service}>
              <Check aria-hidden="true" /> {service}
            </span>
          ))}
        </div>
        <ProductRail
          products={services.slice(0, 6)}
          emptyTitle="No services are published yet."
          onBuy={buy}
        />
      </section>

      <section className="g2-seller-promo">
        <div>
          <span>
            <Store aria-hidden="true" /> BUILT FOR DIGITAL SELLERS
          </span>
          <h2>Upload once. Sell across the whole marketplace.</h2>
          <p>
            New products automatically inherit the same image-led card,
            category, search and catalog layout.
          </p>
          <Link to="/seller/apply">
            Open your store <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <img
          src="/marketplace-assets/seller-growth.webp"
          alt=""
          loading="lazy"
          decoding="async"
          width="960"
          height="720"
        />
      </section>

      <section className="g2-newsletter" id="newsletter">
        <div>
          <Mail aria-hidden="true" />
          <span>
            <strong>Join the Ysello newsletter</strong>
            <small>New releases, seller stories and marketplace updates.</small>
          </span>
        </div>
        <form onSubmit={subscribe}>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (newsletterState !== "idle") setNewsletterState("idle");
            }}
            type="email"
            aria-label="Email address"
            placeholder="Enter your email"
          />
          <button type="submit">Subscribe</button>
        </form>
        <p
          className={newsletterState}
          role={newsletterState === "error" ? "alert" : "status"}
        >
          {newsletterState === "error"
            ? "Enter a valid email address."
            : newsletterState === "success"
              ? "You’re on the list."
              : ""}
        </p>
      </section>

      <section className="market-home-section g2-home-section g2-faq">
        <SectionHeading
          title="Frequently asked questions"
          text="The essentials before you buy or sell."
        />
        <div>
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question} <ChevronDown aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="g2-trust-row" aria-label="Marketplace assurances">
        <span>
          <CreditCard aria-hidden="true" />
          <strong>Protected payments</strong>
          <small>Secure marketplace checkout</small>
        </span>
        <span>
          <BadgeCheck aria-hidden="true" />
          <strong>Verified sellers</strong>
          <small>Approved public storefronts</small>
        </span>
        <span>
          <Download aria-hidden="true" />
          <strong>Clear delivery</strong>
          <small>Terms shown before purchase</small>
        </span>
        <span>
          <ShieldCheck aria-hidden="true" />
          <strong>Buyer protection</strong>
          <small>Support linked to your order</small>
        </span>
        <span>
          <Headphones aria-hidden="true" />
          <strong>Real support</strong>
          <small>Help when you need it</small>
        </span>
      </section>

      <a
        className="g2-newsletter-tab"
        href="#newsletter"
        aria-label="Newsletter"
      >
        <Gift aria-hidden="true" />
        <span>Marketplace news & new releases</span>
      </a>
      <button
        className="g2-scroll-top"
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowRight aria-hidden="true" />
      </button>

      <MarketFooter />
    </main>
  );
}

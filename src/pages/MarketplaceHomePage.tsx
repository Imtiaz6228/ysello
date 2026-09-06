import { UiText } from "../i18n/UiText";
import { CatalogBrowser } from "../components/CatalogBrowser";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Download,
  Grid2X2,
  Headphones,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { categoryPath, productPath } from "../commerce/marketplaceUrls";
import { storefrontCategories } from "../commerce/storefrontCategories";
import {
  useMarketplaceCategories,
  useMarketplaceProductFeed,
  useMarketplaceStores,
  type FeaturedStore,
} from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import {
  MarketplaceBrandArtwork,
  YselloMarketplaceArtwork,
  MarketplaceCategoryIcon,
  detectMarketplaceBrandSlug,
} from "../components/MarketplaceBrandIcon";
import { Seo } from "../components/Seo";
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import { marketplaceTaxonomy } from "../data/marketplaceTaxonomy";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";

function TopStoreCard({ store }: { store: FeaturedStore }) {
  const isOfficial =
    store.isOfficial || ["Official", "Ysello Official"].includes(store.name);
  return (
    <article className="reference-store-card">
      <Link
        className="reference-store-cover"
        to={`/stores/${store.slug}`}
        aria-label={`Visit ${store.name}`}
        style={{
          backgroundImage:
            store.bannerUrl ||
            (isOfficial ? "/ysello-official-banner.svg" : null)
              ? `linear-gradient(135deg, rgba(7, 12, 28, .08), rgba(7, 12, 28, .48)), url(${store.bannerUrl || "/ysello-official-banner.svg"})`
              : undefined,
        }}
      >
        <strong className="ys-store-cover-name">{store.name}</strong>
        <span>
          {isOfficial ? "Official marketplace store" : "Verified store"}
        </span>
      </Link>
      <div className="reference-store-profile">
        <span className="reference-store-logo">
          {store.logoUrl || isOfficial ? (
            <img
              src={store.logoUrl || "/ysello-mark.svg"}
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
              <BadgeCheck aria-hidden="true" />{" "}
              {isOfficial ? "OFFICIAL" : "VERIFIED"}
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

export function MarketplaceHomePage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const { formatProductMoney } = useLocale();
  const { products, loading, error } = useMarketplaceProductFeed();
  const categories = useMarketplaceCategories();
  const stores = useMarketplaceStores();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const accountCategories = useMemo(
    () => storefrontCategories(categories),
    [categories],
  );
  const featured = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            Number((b.stockCount ?? 0) > 0) - Number((a.stockCount ?? 0) > 0) ||
            String(b.publishedAt ?? "").localeCompare(
              String(a.publishedAt ?? ""),
            ),
        )
        .slice(0, 8),
    [products],
  );
  const accounts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            (product.attributes?.supplierFulfilled === true ||
              accountCategories.some(
                (category) => category.slug === product.categorySlug,
              )) &&
            (categoryFilter === "all" ||
              product.categorySlug === categoryFilter),
        )
        .slice(0, 10),
    [products, accountCategories, categoryFilter],
  );
  const availableCategories = accountCategories.filter(
    (category) => (category.productCount ?? 0) > 0,
  );
  function buy(product: CatalogProduct) {
    if (
      product.type !== "SERVICE" &&
      (product.stockCount ?? 0) < (product.minimumOrder ?? 1)
    )
      return;
    add(product);
    navigate("/cart");
  }
  return (
    <main className="market-home-page ys-company-home">
      <Seo
        title="Buy Digital Products, Accounts, Top-Ups & Subscriptions | Ysello"
        description="Buy digital products, social and email accounts, game top-ups, gift cards and subscriptions on Ysello. Compare pricing, delivery terms, stock and seller storefronts before checkout."
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
      <div className="ys-home-container">
        <section className="ys-company-hero" aria-labelledby="ys-home-title">
          <div className="ys-company-hero-copy">
            <span className="ys-eyebrow">
              <UiText value="DIGITAL PRODUCTS · TOP-UPS · ACCOUNTS" />
            </span>
            <h1 id="ys-home-title">
              <UiText value="Buy digital products" />
              <br />
              <em>
                <UiText value="with clear delivery." />
              </em>
            </h1>
            <p>
              <UiText value="Browse social and email accounts, game top-ups, gift cards, subscriptions and other digital essentials. Compare the seller, stock, price and delivery terms before you pay." />
            </p>
            <div className="ys-hero-actions">
              <Link className="ys-primary-link" to="/catalog">
                Browse all products <ArrowRight />
              </Link>
              <a href="#account-listings">
                Shop by category <ArrowRight />
              </a>
            </div>
            <div className="ys-hero-footnote">
              <ShieldCheck /> Clear terms. Secure checkout. Support with every
              order.
            </div>
          </div>
          <div className="ys-hero-platforms">
            <div className="ys-hero-platform-heading">
              <span>ONE MARKETPLACE. YOUR PLATFORMS.</span>
              <Grid2X2 />
            </div>
            <div className="ys-hero-platform-grid">
              {(availableCategories.length
                ? availableCategories
                : accountCategories
              )
                .slice(0, 6)
                .map((category) => {
                  const brand = detectMarketplaceBrandSlug(
                    category.name,
                    category.slug,
                  );
                  return (
                    <Link
                      to={categoryPath(category, categories)}
                      key={category.slug}
                    >
                      {brand ? (
                        <MarketplaceBrandArtwork brandSlug={brand} compact />
                      ) : (
                        <YselloMarketplaceArtwork
                          label={category.name}
                          compact
                        />
                      )}
                      <span>
                        <UiText value={category.name} />
                      </span>
                      <ArrowRight />
                    </Link>
                  );
                })}
            </div>
            <Link className="ys-hero-platform-footer" to="/catalog">
              Discover your next digital essential <ArrowRight />
            </Link>
          </div>
        </section>

        <section
          className="ys-confidence-strip"
          aria-label="Shopping on Ysello"
        >
          <span>
            <BadgeCheck />
            <span>
              <strong>Seller storefronts</strong>
              <small>Know who you buy from</small>
            </span>
          </span>
          <span>
            <ShoppingBag />
            <span>
              <strong>Transparent pricing</strong>
              <small>Compare before checkout</small>
            </span>
          </span>
          <span>
            <Download />
            <span>
              <strong>Digital delivery</strong>
              <small>Access orders in your account</small>
            </span>
          </span>
          <Link to="/support">
            <Headphones />
            <span>
              <strong>Order support</strong>
              <small>Help when you need it</small>
            </span>
          </Link>
        </section>

        <section className="ys-company-section" id="categories">
          <header className="ys-section-heading">
            <div>
              <span className="ys-eyebrow">FIND YOUR PLATFORM</span>
              <h2>
                <UiText value="Shop by category" />
              </h2>
            </div>
            <Link to="/catalog">
              <UiText value="All products" />
              <ArrowRight />
            </Link>
          </header>
          <div className="ys-company-categories">
            {accountCategories.map((category) => {
              const brand = detectMarketplaceBrandSlug(
                category.name,
                category.slug,
              );
              return (
                <Link
                  key={category.slug}
                  to={categoryPath(category, categories)}
                >
                  {brand ? (
                    <MarketplaceBrandArtwork brandSlug={brand} compact />
                  ) : (
                    <YselloMarketplaceArtwork label={category.name} compact />
                  )}
                  <span>
                    <strong>
                      <UiText value={category.name} />
                    </strong>
                    <small>{category.productCount ?? 0} products</small>
                  </span>
                  <ArrowRight />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="ys-company-section" id="account-listings">
          <CatalogBrowser embedded />
        </section>

        <section
          className="ys-collection-banners"
          aria-label="Marketplace collections"
        >
          <Link to="/catalog?stock=in_stock" className="ys-collection-banner">
            <span className="ys-eyebrow">READY WHEN YOU ARE</span>
            <h2>
              <UiText value="Less searching." />
              <br />
              <UiText value="More possibilities." />
            </h2>
            <p>Explore digital products available today.</p>
            <span>
              Shop in-stock products <ArrowRight />
            </span>
          </Link>
          <Link
            to="/catalog"
            className="ys-collection-banner ys-collection-banner-light"
          >
            <span className="ys-eyebrow">EVERYDAY DIGITAL ESSENTIALS</span>
            <h2>
              <UiText value="Make more of" />
              <br />
              <UiText value="your digital day." />
            </h2>
            <p>Subscriptions and software for work and downtime.</p>
            <span>
              Explore subscriptions <ArrowRight />
            </span>
          </Link>
        </section>

        {featured.length ? (
          <section className="ys-company-section" id="products">
            <header className="ys-section-heading">
              <div>
                <span className="ys-eyebrow">EXPLORE THE MARKETPLACE</span>
                <h2>
                  <UiText value="Fresh finds on Ysello" />
                </h2>
              </div>
              <Link to="/catalog?sort=newest">
                View all products <ArrowRight />
              </Link>
            </header>
            <div className="ys-company-product-grid">
              {featured.map((product) => (
                <YselloReferenceProductCard
                  key={product.id}
                  product={product}
                  onBuy={buy}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="ys-company-section" id="top-stores">
          <header className="ys-section-heading">
            <div>
              <span className="ys-eyebrow">THE PEOPLE BEHIND THE PRODUCTS</span>
              <h2>
                <UiText value="Discover our stores" />
              </h2>
              <p>Explore each seller’s products, profile and policies.</p>
            </div>
            <Link to="/seller/apply">
              Open your store <ArrowRight />
            </Link>
          </header>
          <div className="ys-company-store-grid">
            {stores.slice(0, 6).map((store) => (
              <TopStoreCard key={store.slug} store={store} />
            ))}
          </div>
          {!stores.length ? (
            <div className="ys-catalog-empty">
              <Store />
              <h3>
                <UiText value="Storefronts are coming soon" />
              </h3>
              <p>Browse the marketplace for the latest available listings.</p>
              <Link to="/catalog">
                Explore products <ArrowRight />
              </Link>
            </div>
          ) : null}
        </section>

        <section className="ys-shopping-guide" id="how-it-works">
          <div>
            <span className="ys-eyebrow">FROM DISCOVERY TO DELIVERY</span>
            <h2>
              <UiText value="A straightforward way to shop." />
            </h2>
            <Link to="/buyer-protection">
              About buyer protection <ArrowRight />
            </Link>
          </div>
          <ol>
            <li>
              <b>01</b>
              <span>
                <strong>Find your product</strong>
                <p>
                  Choose a category and compare listing details, availability
                  and seller terms.
                </p>
              </span>
            </li>
            <li>
              <b>02</b>
              <span>
                <strong>Review and check out</strong>
                <p>
                  Choose your quantity, review your cart and complete payment.
                </p>
              </span>
            </li>
            <li>
              <b>03</b>
              <span>
                <strong>Access your order</strong>
                <p>
                  Find delivery details and contact support from your buyer
                  dashboard.
                </p>
              </span>
            </li>
          </ol>
        </section>

        <section className="ys-company-section ys-home-faq">
          <header className="ys-section-heading">
            <div>
              <h2>
                <UiText value="A few things before you buy" />
              </h2>
            </div>
            <Link to="/support">
              Visit help center <ArrowRight />
            </Link>
          </header>
          {[
            [
              "How will I receive my order?",
              "The listing shows the delivery method. After confirmed payment, open your buyer dashboard to view delivery details and order status.",
            ],
            [
              "Where can I check account details?",
              "Open the product page to review the platform, account information, minimum quantity and replacement terms before adding it to your cart.",
            ],
            [
              "What if I need help after buying?",
              "Open the relevant order in your dashboard to contact support. Replacement and refund eligibility depend on the listing terms and marketplace policy.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>

        <section className="ys-seller-invitation">
          <div>
            <span className="ys-eyebrow">GROW WITH YSELLO</span>
            <h2>
              <UiText value="Your products. Your storefront." />
            </h2>
            <p>
              Build your store with a custom banner, logo and a catalog of your
              own.
            </p>
          </div>
          <Link className="ys-primary-link" to="/seller/apply">
            Become a seller <ArrowRight />
          </Link>
        </section>
      </div>
      <MarketFooter />
    </main>
  );
}

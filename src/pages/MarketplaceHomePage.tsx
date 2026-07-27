import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Code2,
  CreditCard,
  Download,
  FileStack,
  Headphones,
  Layers3,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Video,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import {
  useMarketplaceCategories,
  useMarketplaceProducts,
  useMarketplaceReviews,
  useMarketplaceStores,
} from "../commerce/useMarketplace";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import { Seo } from "../components/Seo";
import {
  marketplaceTaxonomy,
  type MarketplaceTaxonomyItem,
} from "../data/marketplaceTaxonomy";
import type { CatalogProduct } from "../data/catalog";

const categoryIcons: Record<string, LucideIcon> = {
  "ai-tools-workflows": Bot,
  "design-creative-assets": Palette,
  "software-productivity": Boxes,
  "website-themes-plugins": Code2,
  "video-streaming-assets": Video,
  "business-marketing-kits": BriefcaseBusiness,
  "learning-resources-guides": BookOpen,
  "professional-digital-services": Sparkles,
};

const trustItems = [
  {
    title: "Protected payments",
    text: "Secure checkout with order-linked confirmation.",
    icon: CreditCard,
    tone: "blue",
  },
  {
    title: "Verified sellers",
    text: "Public listings come from approved sellers.",
    icon: BadgeCheck,
    tone: "purple",
  },
  {
    title: "Digital delivery",
    text: "Delivery terms are shown before you buy.",
    icon: Download,
    tone: "orange",
  },
  {
    title: "Buyer protection",
    text: "Eligible orders include dispute assistance.",
    icon: ShieldCheck,
    tone: "emerald",
  },
  {
    title: "Responsive support",
    text: "Get help with the relevant order attached.",
    icon: Headphones,
    tone: "blue",
  },
];

const serviceHighlights = [
  "Brand identity design",
  "Website setup and customization",
  "AI workflow setup",
  "Video editing and motion graphics",
  "Presentation design",
  "SEO and content support",
];

const faqs = [
  {
    question: "How are digital products delivered?",
    answer:
      "Each listing shows its delivery method before checkout. Instant downloads appear in the buyer dashboard after confirmed payment; seller-delivered work stays connected to the order.",
  },
  {
    question: "How does Ysello verify sellers?",
    answer:
      "Only seller profiles that have completed marketplace verification can publish public listings. Verification status is shown from the marketplace record, not added as a decorative badge.",
  },
  {
    question: "What products are prohibited?",
    answer:
      "Accounts, credentials, passwords, session cookies, recovery access, unauthorized keys, fake engagement and other abusive or unlawful products are not allowed.",
  },
  {
    question: "When can I request support or a refund?",
    answer:
      "Open the relevant order in your dashboard to contact support. Eligibility depends on the listing, delivery state and the refund policy shown before purchase.",
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
    ...taxonomy.subcategories.map((item) => item.slug),
  ]);
  return categories
    .filter(
      (category) =>
        acceptedSlugs.has(category.slug) ||
        acceptedSlugs.has(category.parentSlug ?? ""),
    )
    .reduce((total, category) => total + (category.productCount ?? 0), 0);
}

function SectionHeading({
  eyebrow,
  title,
  text,
  href,
  action = "View all",
}: {
  eyebrow: string;
  title: string;
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="market-section-heading">
      <div>
        <span>{eyebrow}</span>
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

function ProductGrid({
  products,
  emptyTitle,
  emptyText,
  onBuy,
}: {
  products: CatalogProduct[];
  emptyTitle: string;
  emptyText: string;
  onBuy: (product: CatalogProduct) => void;
}) {
  if (!products.length) {
    return (
      <div className="market-data-empty">
        <FileStack aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <p>{emptyText}</p>
        <Link to="/catalog">Browse the full marketplace</Link>
      </div>
    );
  }

  return (
    <div className="market-product-grid marketplace-list ys-home-product-identity">
      {products.map((product) => (
        <MarketplaceProductCard
          key={product.id}
          product={product}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}

export function MarketplaceHomePage() {
  const navigate = useNavigate();
  const { add } = useCart();
  const products = useMarketplaceProducts();
  const categories = useMarketplaceCategories();
  const stores = useMarketplaceStores();
  const reviews = useMarketplaceReviews();
  const [query, setQuery] = useState("");
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
        .slice(0, 8),
    [products],
  );

  const services = useMemo(
    () => products.filter((product) => product.type === "SERVICE").slice(0, 8),
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
        .slice(0, 8),
    [products],
  );

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/catalog${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  function buy(product: CatalogProduct) {
    add(product);
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
    <main className="market-home-page">
      <Seo
        title="Ysello — Verified digital goods and professional services"
        description="Discover licensed software, creative assets, AI workflows, business resources and expert digital services from verified sellers."
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

      <section className="market-home-hero pro-market-hero">
        <div className="market-hero-copy">
          <span className="market-eyebrow">
            <BadgeCheck aria-hidden="true" />
            Verified digital goods. Instant access.
          </span>
          <h1>Tools, assets and services to move your ideas forward.</h1>
          <p>
            Discover licensed software, creative assets, AI workflows, business
            resources and expert digital services from verified sellers.
          </p>
          <form className="market-hero-search" onSubmit={submitSearch}>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search templates, tools, assets and services"
              placeholder="Search templates, tools, assets and services"
            />
            <button type="submit">
              Search <ArrowRight aria-hidden="true" />
            </button>
          </form>
          <div className="market-hero-actions">
            <Link className="market-primary-action" to="/catalog">
              Explore Marketplace <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="market-secondary-action" to="/seller/apply">
              Start Selling
            </Link>
          </div>
          <small className="market-hero-note">
            <ShieldCheck aria-hidden="true" /> Protected checkout · Clear
            delivery terms · Order-linked support
          </small>
        </div>
        <div className="market-hero-visual">
          <img
            src="/marketplace-assets/hero-marketplace.webp"
            alt="A curated collection of digital product and service cards in the Ysello marketplace"
          />
          <span className="market-visual-badge visual-badge-one">
            <ShieldCheck aria-hidden="true" />
            Protected checkout
          </span>
          <span className="market-visual-badge visual-badge-two">
            <Zap aria-hidden="true" />
            Delivery shown upfront
          </span>
          <span className="market-visual-badge visual-badge-three">
            <BadgeCheck aria-hidden="true" />
            Verified seller
          </span>
        </div>
      </section>

      <section className="market-trust-grid" aria-label="Why buyers choose Ysello">
        {trustItems.map(({ title, text, icon: Icon, tone }) => (
          <article className={`tone-${tone}`} key={title}>
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="market-home-section" id="categories">
        <SectionHeading
          eyebrow="One clear taxonomy"
          title="Popular categories"
          text="Explore legitimate digital goods and well-scoped professional services."
          href="/catalog"
          action="View all categories"
        />
        <div className="market-category-grid lux-quick-categories lux-main-category-row homepage-category-icons">
          {marketplaceTaxonomy.map((category) => {
            const Icon = categoryIcons[category.slug] ?? Layers3;
            const count = categoryCount(category, categories);
            return (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className={`market-category-card tone-${category.accent}`}
                onFocus={() => setFocusedCategorySlug(category.slug)}
                onMouseEnter={() => setFocusedCategorySlug(category.slug)}
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.description}</p>
                  <small>
                    {count
                      ? `${count.toLocaleString()} published listing${count === 1 ? "" : "s"}`
                      : "No published listings yet"}
                  </small>
                </div>
                <ArrowRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <div
          className="market-subcategory-preview lux-subcategory-preview-grid"
          aria-label={`${focusedCategory.name} specialties`}
        >
          <strong>{focusedCategory.name}</strong>
          {focusedCategory.subcategories.slice(0, 8).map((subcategory) => (
            <Link
              key={subcategory.slug}
              to={`/categories/${subcategory.slug}`}
            >
              <span>{subcategory.name}</span>
              <small>{subcategory.description}</small>
              <ArrowRight aria-hidden="true" />
            </Link>
          ))}
          <Link to={`/categories/${focusedCategory.slug}`}>
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="market-home-section market-tinted-section"
        id="professional-services"
      >
        <SectionHeading
          eyebrow="Expert delivery"
          title="Featured professional services"
          text="Hire specialists through a protected order with scope, delivery time and price visible before checkout."
          href="/catalog?kind=SERVICE"
          action="Browse services"
        />
        <div className="market-service-chips" aria-label="Popular service types">
          {serviceHighlights.map((service) => (
            <span key={service}>
              <Check aria-hidden="true" /> {service}
            </span>
          ))}
        </div>
        <ProductGrid
          products={services}
          emptyTitle="No verified services are published yet."
          emptyText="This section updates automatically when approved professional services become available."
          onBuy={buy}
        />
      </section>

      <section
        className="market-home-section"
        id="products"
        data-section="products"
      >
        <SectionHeading
          eyebrow="Buyer favorites"
          title="Best-selling products"
          text="Ranked from published marketplace sales and verified buyer activity."
          href="/catalog?sort=popular"
          action="Explore products"
        />
        <ProductGrid
          products={bestSellers}
          emptyTitle="No published products are available yet."
          emptyText="Approved products will appear here automatically. No demonstration listings are shown."
          onBuy={buy}
        />
      </section>

      <section className="market-home-section market-how-section" id="how-it-works">
        <SectionHeading
          eyebrow="A clear buying flow"
          title="How Ysello works"
          text="From discovery to delivery, every important detail stays connected to your order."
        />
        <div className="market-step-grid">
          {[
            {
              number: "01",
              title: "Browse verified products",
              text: "Compare licensing, delivery, seller details and availability.",
              icon: Search,
            },
            {
              number: "02",
              title: "Pay through protected checkout",
              text: "Confirm the product and use the payment options available to you.",
              icon: CreditCard,
            },
            {
              number: "03",
              title: "Receive your order",
              text: "Access the download or follow seller delivery in your dashboard.",
              icon: Download,
            },
          ].map(({ number, title, text, icon: Icon }) => (
            <article key={number}>
              <span>{number}</span>
              <i>
                <Icon aria-hidden="true" />
              </i>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="market-protection-feature">
        <div className="market-protection-visual">
          <img
            src="/marketplace-assets/buyer-protection.webp"
            alt="A secure digital checkout and delivery workspace"
            loading="lazy"
          />
        </div>
        <div>
          <span className="market-eyebrow">
            <ShieldCheck aria-hidden="true" /> Buyer protection
          </span>
          <h2>Clear support when a digital order needs attention.</h2>
          <p>
            Ysello keeps the listing, checkout confirmation, delivery record
            and support conversation tied to the same order.
          </p>
          <ul>
            {[
              "Secure checkout confirmation",
              "Delivery status and order record",
              "Dispute assistance for eligible orders",
              "Refund eligibility explained in policy",
              "Public listings from verified sellers",
            ].map((item) => (
              <li key={item}>
                <Check aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
          <Link to="/buyer-protection">
            Read the buyer-protection policy <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="market-home-section" id="sellers">
        <SectionHeading
          eyebrow="Verified storefronts"
          title="Popular stores"
          text="Store details below come directly from verified seller profiles."
          href="/catalog"
          action="Browse marketplace"
        />
        {stores.length ? (
          <div className="market-store-grid">
            {stores.slice(0, 4).map((store) => (
              <article key={store.slug}>
                <div className="market-store-cover">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={`${store.name} logo`} />
                  ) : (
                    <span>{store.mark}</span>
                  )}
                </div>
                <span>
                  <BadgeCheck aria-hidden="true" /> Verified seller
                </span>
                <h3>{store.name}</h3>
                <p>{store.about}</p>
                <dl>
                  <div>
                    <dt>Rating</dt>
                    <dd>
                      {store.rating ? (
                        <>
                          <Star fill="currentColor" aria-hidden="true" />{" "}
                          {store.rating.toFixed(1)}
                        </>
                      ) : (
                        "New"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Completed sales</dt>
                    <dd>{store.sales.toLocaleString()}</dd>
                  </div>
                </dl>
                <Link to={`/stores/${store.slug}`}>
                  Visit Store <ArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="market-data-empty">
            <Store aria-hidden="true" />
            <strong>No verified storefronts are available yet.</strong>
            <p>Stores appear here only after marketplace verification.</p>
            <Link to="/seller/apply">Apply to become a seller</Link>
          </div>
        )}
      </section>

      <section className="market-home-section market-tinted-section">
        <SectionHeading
          eyebrow="Recently published"
          title="New arrivals"
          text="The newest approved listings, ordered by their publication record."
          href="/catalog?sort=newest"
          action="See all new arrivals"
        />
        <ProductGrid
          products={newArrivals}
          emptyTitle="No new arrivals are available."
          emptyText="Newly approved products will appear here automatically."
          onBuy={buy}
        />
      </section>

      <section className="market-seller-feature">
        <div>
          <span className="market-eyebrow">
            <Store aria-hidden="true" /> Sell on Ysello
          </span>
          <h2>Open a professional digital storefront.</h2>
          <p>
            Publish legitimate products and services, manage delivery, respond
            to buyers and track real orders from one seller workspace.
          </p>
          <div className="market-seller-benefits">
            <span>
              <Check aria-hidden="true" /> Transparent marketplace policy
            </span>
            <span>
              <Check aria-hidden="true" /> Clear listing moderation
            </span>
            <span>
              <Check aria-hidden="true" /> Order-linked buyer messaging
            </span>
            <span>
              <Check aria-hidden="true" /> Payout status in your dashboard
            </span>
          </div>
          <Link className="market-primary-action" to="/seller/apply">
            Open Your Store <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <img
          src="/marketplace-assets/seller-growth.webp"
          alt="A clean seller workspace for managing digital products and orders"
          loading="lazy"
        />
      </section>

      <section className="market-home-section">
        <SectionHeading
          eyebrow="Verified purchases only"
          title="What buyers are saying"
          text="Feedback appears only when it is tied to an eligible completed purchase."
        />
        {reviews.length ? (
          <div className="market-review-grid">
            {reviews.slice(0, 4).map((review) => (
              <article key={review.id}>
                <div>
                  <span>{review.initials}</span>
                  <div>
                    <strong>{review.buyerName}</strong>
                    <small>
                      <BadgeCheck aria-hidden="true" /> Verified purchase
                    </small>
                  </div>
                  <time dateTime={review.createdAt}>{review.date}</time>
                </div>
                <p>“{review.body}”</p>
                <footer>
                  <span aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} fill="currentColor" aria-hidden="true" />
                    ))}
                  </span>
                  <Link to={`/products/${review.productSlug}`}>
                    {review.productName}
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="market-data-empty">
            <Star aria-hidden="true" />
            <strong>No verified buyer feedback is available yet.</strong>
            <p>Reviews appear only after an eligible completed purchase.</p>
            <Link to="/catalog">Explore published listings</Link>
          </div>
        )}
      </section>

      <section className="market-home-section market-faq-section">
        <SectionHeading
          eyebrow="Helpful answers"
          title="Frequently asked questions"
          text="The essentials for buying and selling legitimate digital products."
          href="/support"
          action="Visit support"
        />
        <div className="market-faq-list">
          {faqs.map(({ question, answer }) => (
            <details key={question}>
              <summary>
                {question} <ChevronDown aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="market-newsletter">
        <div>
          <span>
            {newsletterState === "success" ? (
              <Check aria-hidden="true" />
            ) : (
              <ShoppingBag aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>
              {newsletterState === "success"
                ? "You’re on the list."
                : "Useful marketplace updates, not inbox noise."}
            </strong>
            <small>
              {newsletterState === "success"
                ? "Your email was validated for marketplace updates."
                : "Hear about newly published resources and practical buyer guides."}
            </small>
          </div>
        </div>
        <form onSubmit={subscribe} noValidate>
          <label htmlFor="market-newsletter-email">Email address</label>
          <div>
            <input
              id="market-newsletter-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setNewsletterState("idle");
              }}
              aria-invalid={newsletterState === "error"}
              aria-describedby="market-newsletter-status"
              placeholder="you@example.com"
            />
            <button type="submit">Subscribe</button>
          </div>
          <small
            id="market-newsletter-status"
            className={newsletterState === "error" ? "error" : ""}
            role="status"
          >
            {newsletterState === "error"
              ? "Enter a valid email address."
              : newsletterState === "success"
                ? "Subscription confirmed."
                : "You can unsubscribe at any time."}
          </small>
        </form>
      </section>

      <MarketFooter />
    </main>
  );
}

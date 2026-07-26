import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronRight,
  CreditCard,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  Layers3,
  PackageCheck,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  UploadCloud,
  Users,
  WandSparkles,
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
import "../marketplace-premium-v2.css";

type FeaturedCategory = {
  name: string;
  description: string;
  slug: string;
  tone: string;
  icon: typeof Users;
  kicker: string;
};

const fallbackCategories: FeaturedCategory[] = [
  {
    name: "Social & Creator",
    description: "Content systems, community kits and creator-ready resources.",
    slug: "instagram",
    tone: "social",
    icon: Users,
    kicker: "Build your audience",
  },
  {
    name: "Games & Streaming",
    description: "Gaming assets, stream packs, coaching and digital extras.",
    slug: "games",
    tone: "gaming",
    icon: Gamepad2,
    kicker: "Upgrade your play",
  },
  {
    name: "AI & Automation",
    description: "Prompts, productive workflows and modern AI-powered tools.",
    slug: "ai-platforms",
    tone: "ai",
    icon: Bot,
    kicker: "Work smarter",
  },
  {
    name: "Software & Apps",
    description: "Useful software, subscriptions and digital essentials.",
    slug: "subscription-platforms",
    tone: "digital",
    icon: Gift,
    kicker: "Power your workflow",
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
    ? {
        ...fallback,
        name: match.name,
        slug: match.slug,
        description: match.description || fallback.description,
      }
    : fallback;
}

function productBelongsTo(product: CatalogProduct, category: FeaturedCategory) {
  const value = `${product.category} ${product.categorySlug}`.toLowerCase();
  if (category.tone === "social")
    return /social|instagram|tiktok|facebook|twitter|discord|telegram/.test(
      value,
    );
  if (category.tone === "gaming")
    return /game|steam|valorant|xbox|playstation|stream/.test(value);
  if (category.tone === "ai")
    return /ai|chatgpt|midjourney|claude|automation/.test(value);
  return /software|subscription|digital|template|business|design/.test(value);
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
      findCategory(categories, ["social", "instagram"], fallbackCategories[0]),
      findCategory(categories, ["game", "stream"], fallbackCategories[1]),
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
    const matches = products.filter((product) =>
      productBelongsTo(product, category),
    );
    return (matches.length ? matches : products).slice(0, 5);
  }, [activeCategory, featuredCategories, products]);

  const selectedCategory =
    featuredCategories.find((category) => category.tone === activeCategory) ??
    featuredCategories[0];
  const SelectedCategoryIcon = selectedCategory.icon;
  const focusedCategory = {
    ...selectedCategory,
    subcategories: categories.filter(
      (category) =>
        category.parentSlug === selectedCategory.slug ||
        category.parentId ===
          categories.find((item) => item.slug === selectedCategory.slug)?.id,
    ),
  };

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(
      `/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
    );
  }

  function buy(product: CatalogProduct) {
    add(product);
    navigate("/cart");
  }

  return (
    <main className="ys-ref-page mpv2-home">
      <Seo
        title="Ysello — The Premium Digital Marketplace"
        description="Discover digital products, gaming resources, AI tools and creator services from verified sellers."
        canonicalPath="/"
      />
      <YselloReferenceHeader />

      <section className="mpv2-hero" data-legacy-hook="pro-market-hero">
        <img
          className="mpv2-hero-art"
          src="/marketplace-assets/ysello-marketplace-hero.png"
          alt=""
        />
        <div className="mpv2-hero-glow" />
        <div className="mpv2-hero-content">
          <span className="mpv2-eyebrow">
            <Sparkles aria-hidden="true" />
            The marketplace for digital ambition
          </span>
          <h1>
            Discover digital.
            <span>Do more with it.</span>
          </h1>
          <p>
            Explore premium tools, creative assets and digital services from
            trusted sellers—curated for work, play and everything you are
            building next.
          </p>
          <form className="mpv2-hero-search" onSubmit={submitSearch}>
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search marketplace"
              placeholder="What are you looking for today?"
            />
            <button type="submit">
              Explore <ArrowRight aria-hidden="true" />
            </button>
          </form>
          <div className="mpv2-hero-actions">
            <Link className="mpv2-primary-button" to="/catalog">
              Browse marketplace <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="mpv2-text-link" to="/seller/apply">
              Start selling <ChevronRight aria-hidden="true" />
            </Link>
          </div>
          <div className="mpv2-hero-trust">
            <div className="mpv2-avatar-stack" aria-hidden="true">
              <span>AR</span>
              <span>MK</span>
              <span>JL</span>
              <span>+</span>
            </div>
            <div>
              <span className="mpv2-stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} fill="currentColor" aria-hidden="true" />
                ))}
              </span>
              <small>Trusted by 125,000+ digital buyers</small>
            </div>
          </div>
        </div>
      </section>

      <section className="mpv2-proof" aria-label="Marketplace statistics">
        {[
          {
            value: "125K+",
            label: "active buyers",
            text: "A growing global community",
            icon: Users,
            tone: "blue",
          },
          {
            value: "250K+",
            label: "orders delivered",
            text: "Digital products, delivered",
            icon: PackageCheck,
            tone: "violet",
          },
          {
            value: "8K+",
            label: "verified sellers",
            text: "Reviewed marketplace stores",
            icon: BadgeCheck,
            tone: "cyan",
          },
          {
            value: "4.8 / 5",
            label: "buyer rating",
            text: "Confidence in every order",
            icon: Star,
            tone: "coral",
          },
        ].map(({ value, label, text, icon: StatIcon, tone }) => {
          return (
            <article key={label} className={`tone-${tone}`}>
              <span>
                <StatIcon aria-hidden="true" />
              </span>
              <div>
                <strong>{value}</strong>
                <b>{label}</b>
                <small>{text}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section
        className="mpv2-section mpv2-discovery"
        id="categories"
        data-legacy-hook="lux-quick-categories"
      >
        <div className="mpv2-section-heading centered">
          <span>Explore without the overwhelm</span>
          <h2>Find your next digital advantage</h2>
          <p>
            Every category is thoughtfully organized so the right product is
            never more than a few clicks away.
          </p>
        </div>
        <div className="mpv2-discovery-layout">
          <div className="mpv2-discovery-visual">
            <img
              src="/marketplace-assets/ysello-product-categories.png"
              alt="A colorful collection of digital marketplace categories"
              loading="lazy"
            />
            <div className="mpv2-visual-note">
              <span>
                <Layers3 aria-hidden="true" />
              </span>
              <div>
                <strong>One marketplace</strong>
                <small>Endless digital possibilities</small>
              </div>
            </div>
          </div>
          <div
            className="mpv2-category-grid homepage-category-icons"
            data-legacy-hook="lux-main-category-row"
          >
            {featuredCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.name}
                  className={`mpv2-category-card tone-${category.tone}`}
                  to={`/categories/${category.slug}`}
                  onFocus={() => setActiveCategory(category.tone)}
                  onMouseEnter={() => setActiveCategory(category.tone)}
                >
                  <div className="mpv2-category-topline">
                    <span>
                      <Icon aria-hidden="true" />
                    </span>
                    <small>0{index + 1}</small>
                  </div>
                  <b>{category.kicker}</b>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <strong>
                    Explore category <ArrowRight aria-hidden="true" />
                  </strong>
                </Link>
              );
            })}
          </div>
        </div>
        {focusedCategory.subcategories.length ? (
          <div className="mpv2-subcategory-preview">
            <div>
              <span>More in {focusedCategory.name}</span>
              <Link to={`/categories/${focusedCategory.slug}`}>
                View all <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div data-legacy-hook="lux-subcategory-preview-grid">
              {focusedCategory.subcategories.slice(0, 8).map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/categories/${subcategory.slug}`}
                >
                  <span>{subcategory.icon || "•"}</span>
                  <strong>{subcategory.name}</strong>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mpv2-section mpv2-trending" id="products">
        <div className="mpv2-section-heading split">
          <div>
            <span>What buyers love right now</span>
            <h2>Trending in the marketplace</h2>
            <p>Popular picks with strong ratings and reliable delivery.</p>
          </div>
          <Link className="mpv2-outline-button" to="/catalog">
            See all products <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mpv2-product-grid" data-legacy-hook="marketplace-list">
          {trendingProducts.map((product) => (
            <div className="ys-home-product-identity" key={product.id}>
              <YselloReferenceProductCard product={product} onBuy={buy} />
            </div>
          ))}
        </div>
      </section>

      <section className="mpv2-section mpv2-confidence">
        <div className="mpv2-confidence-copy">
          <span className="mpv2-eyebrow">
            <ShieldCheck aria-hidden="true" /> Buy with clarity
          </span>
          <h2>Confidence comes built in.</h2>
          <p>
            From seller verification to order-linked support, the experience is
            designed to make digital buying feel refreshingly straightforward.
          </p>
          <div className="mpv2-benefit-grid">
            {[
              {
                icon: BadgeCheck,
                title: "Verified sellers",
                text: "Seller identities and stores are reviewed before they trade.",
              },
              {
                icon: Zap,
                title: "Clear delivery",
                text: "Know exactly what you receive and when to expect it.",
              },
              {
                icon: CreditCard,
                title: "Protected checkout",
                text: "Secure payment handling keeps order details connected.",
              },
              {
                icon: Headphones,
                title: "Human support",
                text: "Helpful marketplace support when an order needs attention.",
              },
            ].map(({ icon: BenefitIcon, title, text }) => {
              return (
                <article key={title}>
                  <span>
                    <BenefitIcon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <Link className="mpv2-primary-button" to="/buyer-protection">
            See how protection works <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mpv2-confidence-visual">
          <img
            src="/marketplace-assets/ysello-secure-instant-delivery.png"
            alt="Secure digital delivery and marketplace protection"
            loading="lazy"
          />
          <div className="mpv2-delivery-chip">
            <Check aria-hidden="true" />
            <span>
              <strong>Order delivered</strong>
              <small>Protected from checkout to completion</small>
            </span>
          </div>
        </div>
      </section>

      <section className="mpv2-section mpv2-curated">
        <div className="mpv2-section-heading centered">
          <span>Curated for the way you work</span>
          <h2>Popular across every category</h2>
          <p>Switch between collections and discover a new favorite.</p>
        </div>
        <div className="mpv2-tabs" role="tablist">
          {featuredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.tone}
                type="button"
                role="tab"
                aria-selected={activeCategory === category.tone}
                className={activeCategory === category.tone ? "active" : ""}
                onClick={() => setActiveCategory(category.tone)}
              >
                <Icon aria-hidden="true" /> {category.name}
              </button>
            );
          })}
        </div>
        <div className={`mpv2-curated-panel tone-${activeCategory}`}>
          <div className="mpv2-curated-intro">
            <span>
              <SelectedCategoryIcon aria-hidden="true" />
            </span>
            <small>Featured collection</small>
            <h3>{selectedCategory.name}</h3>
            <p>{selectedCategory.description}</p>
            <Link to={`/categories/${selectedCategory.slug}`}>
              Browse collection <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="mpv2-curated-list">
            {activeProducts.map((product, index) => (
              <Link key={product.id} to={`/products/${product.slug}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{product.title}</strong>
                  <small>
                    <BadgeCheck aria-hidden="true" /> {product.seller}
                  </small>
                </div>
                <b>${(product.priceCents / 100).toFixed(2)}</b>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mpv2-process" id="how-it-works">
        <div className="mpv2-section-heading centered light">
          <span>A better path from search to success</span>
          <h2>Simple to explore. Safe to order.</h2>
          <p>The whole marketplace keeps every step clear and useful.</p>
        </div>
        <div className="mpv2-process-grid">
          {[
            {
              icon: Search,
              number: "01",
              title: "Discover",
              text: "Browse curated categories, compare details and find the right fit.",
            },
            {
              icon: ShieldCheck,
              number: "02",
              title: "Order securely",
              text: "Check out with a protected order and clear delivery expectations.",
            },
            {
              icon: Rocket,
              number: "03",
              title: "Put it to work",
              text: "Receive your product, confirm delivery and keep building momentum.",
            },
          ].map(({ icon: StepIcon, number, title, text }) => {
            return (
              <article key={title}>
                <b>{number}</b>
                <span>
                  <StepIcon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mpv2-section mpv2-seller-story">
        <div className="mpv2-seller-visual">
          <img
            src="/marketplace-assets/ysello-seller-growth.png"
            alt="A digital marketplace seller growing their online business"
            loading="lazy"
          />
          <div className="mpv2-growth-card">
            <TrendingUp aria-hidden="true" />
            <span>
              <small>Store growth</small>
              <strong>+38.4%</strong>
            </span>
          </div>
        </div>
        <div className="mpv2-seller-copy">
          <span className="mpv2-eyebrow">
            <Store aria-hidden="true" /> Built for digital sellers
          </span>
          <h2>Your products deserve a premium storefront.</h2>
          <p>
            Reach buyers who are actively looking for digital value. Present
            products professionally, manage orders clearly and grow with
            confidence.
          </p>
          <ul>
            <li>
              <Check aria-hidden="true" /> A storefront that builds buyer trust
            </li>
            <li>
              <Check aria-hidden="true" /> Simple product and order management
            </li>
            <li>
              <Check aria-hidden="true" /> Marketplace discovery and seller
              tools
            </li>
          </ul>
          <div>
            <Link className="mpv2-primary-button" to="/seller/apply">
              Open your store <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="mpv2-text-link" to="/seller">
              Visit seller dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mpv2-section mpv2-stores" id="sellers">
        <div className="mpv2-section-heading split">
          <div>
            <span>People behind great digital products</span>
            <h2>Meet top verified stores</h2>
          </div>
          <Link className="mpv2-outline-button" to="/catalog">
            Explore stores <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mpv2-store-grid">
          {(stores.length ? stores.slice(0, 4) : fallbackStores).map(
            (store, index) => (
              <article key={store.name}>
                <div className={`mpv2-store-cover cover-${index + 1}`}>
                  <Sparkles aria-hidden="true" />
                </div>
                <div className="mpv2-store-avatar">{store.mark}</div>
                <div className="mpv2-store-copy">
                  <h3>
                    {store.name} <BadgeCheck aria-label="Verified store" />
                  </h3>
                  <div>
                    <span>
                      <Star fill="currentColor" aria-hidden="true" />{" "}
                      {store.rating || "New"}
                    </span>
                    <span>{store.sales.toLocaleString()} sales</span>
                  </div>
                  <Link to={store.slug ? `/stores/${store.slug}` : "/catalog"}>
                    Visit store <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="mpv2-section mpv2-community">
        <div className="mpv2-community-intro">
          <span className="mpv2-eyebrow">
            <Globe2 aria-hidden="true" /> A marketplace people return to
          </span>
          <h2>Made for the digital economy. Loved by real people.</h2>
          <p>
            Creators, teams and curious buyers use Ysello to discover products
            that make a genuine difference.
          </p>
          <div>
            <strong>4.8</strong>
            <span>
              <span className="mpv2-stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} fill="currentColor" aria-hidden="true" />
                ))}
              </span>
              <small>average buyer rating</small>
            </span>
          </div>
        </div>
        <div className="mpv2-quotes">
          {[
            [
              "AR",
              "Alex Rivera",
              "Independent creator",
              "The whole experience feels curated, not cluttered. I found exactly what I needed and delivery was effortless.",
            ],
            [
              "MK",
              "Mia Khan",
              "Growth consultant",
              "Clear details and verified sellers make Ysello feel a level above the usual digital marketplaces.",
            ],
            [
              "DL",
              "David Lee",
              "Studio founder",
              "Professional, quick and genuinely useful. It is now one of the first places I check for digital resources.",
            ],
          ].map(([initials, name, role, quote]) => (
            <article key={name}>
              <WandSparkles aria-hidden="true" />
              <p>“{quote}”</p>
              <footer>
                <span>{initials}</span>
                <div>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="mpv2-section mpv2-faq">
        <div className="mpv2-faq-intro">
          <span>Good to know</span>
          <h2>Answers before you even have to ask.</h2>
          <p>
            Still need help? Our support team can point you in the right
            direction.
          </p>
          <Link to="/support">
            Visit the help center <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mpv2-faq-list">
          {[
            [
              "Is it safe to buy from Ysello?",
              "Yes. Eligible orders keep seller, delivery and support information connected so the marketplace can help when needed.",
            ],
            [
              "How are products delivered?",
              "Each listing clearly explains its delivery method and expected timing before you place an order.",
            ],
            [
              "How are sellers verified?",
              "Sellers complete a marketplace review before receiving verified status, and their performance remains visible to buyers.",
            ],
            [
              "Can I get support after purchasing?",
              "Absolutely. Your order history keeps the key details in one place, with support available if something needs attention.",
            ],
            [
              "Can I sell my own digital products?",
              "Yes. Apply for a seller account, complete the review and build a professional storefront for your products or services.",
            ],
          ].map(([question, answer], index) => (
            <details key={question} open={index === 0}>
              <summary>
                {question} <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mpv2-final">
        <div className="mpv2-final-orb orb-one" />
        <div className="mpv2-final-orb orb-two" />
        <div className="mpv2-final-icon">
          <ShoppingBag aria-hidden="true" />
        </div>
        <span>Your next great find is waiting</span>
        <h2>Make your next digital move.</h2>
        <p>
          Discover premium products from verified sellers, all in one inspiring
          marketplace.
        </p>
        <div>
          <Link className="mpv2-light-button" to="/catalog">
            Explore marketplace <ArrowRight aria-hidden="true" />
          </Link>
          <Link className="mpv2-ghost-button" to="/seller/apply">
            <UploadCloud aria-hidden="true" /> Become a seller
          </Link>
        </div>
      </section>

      <YselloReferenceFooter />
    </main>
  );
}

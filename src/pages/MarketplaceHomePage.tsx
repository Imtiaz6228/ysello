import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Box,
  Check,
  ChevronDown,
  Cloud,
  CloudUpload,
  Coins,
  Gamepad2,
  Gift,
  Globe2,
  Grid2X2,
  Headphones,
  LockKeyhole,
  Menu,
  MonitorSmartphone,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { useMarketplaceProducts } from "../commerce/useMarketplace";
import { catalogProducts, type CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";
import { Seo } from "../components/Seo";
import "../homepage-approved.css";

type HomeCategory = {
  name: string;
  description: string;
  href: string;
  tone: string;
  icon: LucideIcon;
};

const homeCategories: HomeCategory[] = [
  {
    name: "Social Media",
    description: "Creator tools and growth resources",
    href: "/categories/instagram",
    tone: "blue",
    icon: Users,
  },
  {
    name: "Gaming",
    description: "Assets, guides and in-game goods",
    href: "/categories/games-gaming",
    tone: "violet",
    icon: Gamepad2,
  },
  {
    name: "AI Platforms",
    description: "Tools, apps and smart workflows",
    href: "/categories/ai-workflows",
    tone: "green",
    icon: Sparkles,
  },
  {
    name: "Streaming",
    description: "Entertainment and creator packs",
    href: "/categories/streaming-overlays",
    tone: "coral",
    icon: Play,
  },
  {
    name: "Software",
    description: "Licenses and productivity tools",
    href: "/categories/software-apps",
    tone: "orange",
    icon: Grid2X2,
  },
  {
    name: "Gift Cards",
    description: "Digital gifts and top-ups",
    href: "/catalog?q=gift%20card",
    tone: "yellow",
    icon: Gift,
  },
];

const platformItems = [
  { label: "Web Apps", count: "2,842 items", icon: Globe2 },
  { label: "Windows", count: "1,934 items", icon: Grid2X2 },
  { label: "macOS", count: "1,126 items", icon: MonitorSmartphone },
  { label: "Android", count: "1,876 items", icon: Bot },
  { label: "iOS", count: "1,432 items", icon: MonitorSmartphone },
  { label: "Cloud", count: "1,205 items", icon: Cloud },
];

const benefits = [
  {
    title: "Verified listings",
    text: "Every product is reviewed for quality and clarity.",
    tone: "blue",
    icon: ShieldCheck,
  },
  {
    title: "Protected payments",
    text: "Your payment is secure until you receive your order.",
    tone: "green",
    icon: LockKeyhole,
  },
  {
    title: "Instant access",
    text: "Most products are delivered instantly, 24/7.",
    tone: "violet",
    icon: Zap,
  },
  {
    title: "Human support",
    text: "Our support team is here whenever you need help.",
    tone: "orange",
    icon: Headphones,
  },
];

const testimonials = [
  {
    initials: "AM",
    name: "Alex M.",
    quote:
      "Great prices, instant delivery and everything worked exactly as promised.",
  },
  {
    initials: "SK",
    name: "Sarah K.",
    quote:
      "I found several useful digital tools here. The whole process was smooth and reliable.",
  },
  {
    initials: "DR",
    name: "David R.",
    quote:
      "Customer support was excellent. They helped me quickly and I will definitely buy again.",
  },
];

const faqs = [
  {
    question: "How does instant delivery work?",
    answer:
      "Instant products are released to your buyer dashboard as soon as the protected checkout is complete.",
  },
  {
    question: "Are products on ysello.com safe and legal?",
    answer:
      "Listings must follow marketplace rules. Sellers and products are reviewed, and prohibited products are removed.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "The secure checkout shows all payment methods currently available for your location and currency.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Eligible orders are covered by the refund and dispute terms shown before purchase.",
  },
];

function getProductTone(product: CatalogProduct) {
  const text = `${product.title} ${product.category}`.toLowerCase();
  if (/instagram|social|creator|tiktok/.test(text)) return "pink";
  if (/game|gaming|stream|overlay/.test(text)) return "gold";
  if (/ai|prompt|automation/.test(text)) return "violet";
  if (/cloud|vpn|security/.test(text)) return "teal";
  if (/music|audio/.test(text)) return "orange";
  return "blue";
}

function getProductIcon(product: CatalogProduct): LucideIcon {
  const text = `${product.title} ${product.category}`.toLowerCase();
  if (/game|gaming/.test(text)) return Gamepad2;
  if (/stream|video/.test(text)) return Play;
  if (/ai|prompt|automation/.test(text)) return Sparkles;
  if (/cloud/.test(text)) return CloudUpload;
  if (/coin|credit/.test(text)) return Coins;
  if (/social|instagram|creator|tiktok/.test(text)) return TrendingUp;
  if (/security|vpn/.test(text)) return LockKeyhole;
  return Box;
}

function HomeProductCard({ product }: { product: CatalogProduct }) {
  const { formatMoney } = useLocale();
  const ProductIcon = getProductIcon(product);
  const tone = getProductTone(product);

  return (
    <article className={`ysa-product-card ysa-tone-${tone}`}>
      <Link
        className="ysa-product-media"
        to={`/products/${product.slug}`}
        aria-label={`View ${product.title}`}
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <>
            <span className="ysa-product-orbit" aria-hidden="true" />
            <ProductIcon aria-hidden="true" />
          </>
        )}
      </Link>
      <div className="ysa-product-copy">
        <Link className="ysa-product-title" to={`/products/${product.slug}`}>
          {product.title}
        </Link>
        <Link
          className="ysa-product-seller"
          to={product.sellerSlug ? `/stores/${product.sellerSlug}` : "/catalog"}
        >
          {product.seller} <BadgeCheck aria-hidden="true" />
        </Link>
        <div className="ysa-product-rating">
          <Star fill="currentColor" aria-hidden="true" />
          <span>{product.rating || "New"}</span>
          <small>({product.reviews})</small>
        </div>
        <span className="ysa-delivery-badge">
          <Zap aria-hidden="true" /> {product.delivery || "Instant delivery"}
        </span>
        <strong className="ysa-product-price">
          {formatMoney(product.priceCents)}
        </strong>
      </div>
    </article>
  );
}

function MarketplaceHeroArt() {
  const cards = [
    {
      className: "social",
      label: "Social Media",
      detail: "250+ items",
      icon: Users,
    },
    {
      className: "gaming",
      label: "Gaming",
      detail: "1,200+ items",
      icon: Gamepad2,
    },
    {
      className: "ai",
      label: "AI Tools",
      detail: "600+ items",
      icon: Sparkles,
    },
    {
      className: "software",
      label: "Software",
      detail: "900+ items",
      icon: Grid2X2,
    },
  ];

  return (
    <div className="ysa-hero-art" aria-hidden="true">
      <i className="ysa-blob blob-one" />
      <i className="ysa-blob blob-two" />
      <i className="ysa-blob blob-three" />
      <i className="ysa-blob blob-four" />
      {cards.map(({ className, label, detail, icon: Icon }) => (
        <div className={`ysa-market-card ${className}`} key={label}>
          <span>
            <Icon />
          </span>
          <div>
            <strong>{label}</strong>
            <small>{detail}</small>
          </div>
          <div className="ysa-mini-chart">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
      <span className="ysa-float-icon shield">
        <LockKeyhole />
      </span>
      <span className="ysa-float-icon bolt">
        <Zap />
      </span>
      <span className="ysa-float-icon cart">
        <ShoppingBag />
      </span>
    </div>
  );
}

function HomeHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const accountPath = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/catalog${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <header className="ysa-header">
      <div className="ysa-announcement">
        <span>
          <Zap aria-hidden="true" /> Instant delivery
        </span>
        <i />
        <span>
          <ShieldCheck aria-hidden="true" /> Secure checkout
        </span>
        <i />
        <span>
          <BadgeCheck aria-hidden="true" /> Verified sellers
        </span>
      </div>
      <div className="ysa-nav-shell">
        <Link className="ysa-wordmark" to="/" aria-label="Ysello home">
          <strong>ysello</strong>
          <span>.com</span>
        </Link>
        <nav className="ysa-desktop-nav" aria-label="Primary navigation">
          <Link to="/catalog">
            Browse <ChevronDown aria-hidden="true" />
          </Link>
          <Link to="/#categories">
            Categories <ChevronDown aria-hidden="true" />
          </Link>
          <Link to="/seller/apply">Sell</Link>
          <Link to="/support">
            Support <ChevronDown aria-hidden="true" />
          </Link>
        </nav>
        <form className="ysa-header-search" onSubmit={search}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search digital products"
            placeholder="Search digital products"
          />
          <button type="submit" aria-label="Search">
            <Search aria-hidden="true" />
          </button>
        </form>
        <div className="ysa-desktop-actions">
          <Link to={accountPath}>{user ? "Account" : "Sign in"}</Link>
          <Link className="ysa-start-button" to="/seller/apply">
            Start selling
          </Link>
          <Link
            className="ysa-cart"
            to="/cart"
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingBag aria-hidden="true" />
            {count ? <b>{count}</b> : null}
          </Link>
        </div>
        <div className="ysa-mobile-actions">
          <button
            type="button"
            onClick={() =>
              document.getElementById("mobile-market-search")?.focus()
            }
          >
            <Search aria-hidden="true" />
            <span className="sr-only">Focus search</span>
          </button>
          <Link to={accountPath} aria-label={user ? "Account" : "Sign in"}>
            <UserRound aria-hidden="true" />
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </div>
      <form className="ysa-mobile-search" onSubmit={search}>
        <Search aria-hidden="true" />
        <input
          id="mobile-market-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search digital products"
          placeholder="Search digital products"
        />
      </form>
      {menuOpen ? (
        <>
          <button
            className="ysa-menu-scrim"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="ysa-mobile-menu" aria-label="Mobile navigation">
            <div>
              <Link
                className="ysa-wordmark"
                to="/"
                onClick={() => setMenuOpen(false)}
              >
                <strong>ysello</strong>
                <span>.com</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <Link to="/catalog">Browse marketplace</Link>
            <Link to="/#categories">Categories</Link>
            <Link to="/seller/apply">Start selling</Link>
            <Link to="/support">Support</Link>
            <Link to="/cart">Cart ({count})</Link>
            <Link className="ysa-start-button" to={accountPath}>
              {user ? "Open account" : "Sign in"}
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  );
}

function SellerDashboardPreview() {
  return (
    <div className="ysa-seller-dashboard" aria-label="Seller dashboard preview">
      <header>
        <strong>Seller dashboard</strong>
        <span>×</span>
      </header>
      <div className="ysa-dashboard-stats">
        <span>
          <small>Total sales</small>
          <strong>$12,540</strong>
          <em>+10.6%</em>
        </span>
        <span>
          <small>Orders</small>
          <strong>356</strong>
          <em>+12.3%</em>
        </span>
        <span>
          <small>Top products</small>
          <strong>24</strong>
          <em>Live</em>
        </span>
      </div>
      <div className="ysa-dashboard-main">
        <div>
          <small>Sales overview</small>
          <svg viewBox="0 0 300 90" role="img" aria-label="Rising sales chart">
            <polyline
              points="0,72 28,54 57,64 86,39 114,52 143,31 171,43 200,18 229,34 257,10 300,22"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </div>
        <ul>
          <li>
            <i className="violet" /> AI Pro Access <b>$2,540</b>
          </li>
          <li>
            <i className="blue" /> Game Accounts <b>$1,960</b>
          </li>
          <li>
            <i className="green" /> Software Keys <b>$1,620</b>
          </li>
          <li>
            <i className="coral" /> Streaming <b>$1,350</b>
          </li>
        </ul>
      </div>
    </div>
  );
}

function HomeFooter() {
  return (
    <footer className="ysa-footer">
      <div className="ysa-footer-grid">
        <div className="ysa-footer-brand">
          <Link className="ysa-wordmark" to="/">
            <strong>ysello</strong>
            <span>.com</span>
          </Link>
          <p>
            The trusted marketplace for digital products, software and creative
            tools.
          </p>
          <div className="ysa-social-row" aria-label="Social links">
            <a href="https://x.com" aria-label="X">
              X
            </a>
            <a href="https://instagram.com" aria-label="Instagram">
              ◎
            </a>
            <a href="https://youtube.com" aria-label="YouTube">
              ▶
            </a>
          </div>
        </div>
        <div className="ysa-footer-column">
          <strong>Marketplace</strong>
          <Link to="/catalog">All categories</Link>
          <Link to="/catalog">Trending now</Link>
          <Link to="/catalog">New arrivals</Link>
          <Link to="/catalog">Top sellers</Link>
        </div>
        <div className="ysa-footer-column">
          <strong>Sell</strong>
          <Link to="/seller/apply">Start selling</Link>
          <Link to="/seller">Seller dashboard</Link>
          <Link to="/seller-policy">Fees & payouts</Link>
          <Link to="/support">Seller guide</Link>
        </div>
        <div className="ysa-footer-column">
          <strong>Help</strong>
          <Link to="/support">Help center</Link>
          <Link to="/contact">Contact support</Link>
          <Link to="/buyer-protection">Delivery guide</Link>
          <Link to="/refund-policy">Refund policy</Link>
        </div>
        <div className="ysa-footer-column">
          <strong>Legal</strong>
          <Link to="/terms">Terms of service</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/seller-policy">Cookie policy</Link>
          <Link to="/copyright">Copyright</Link>
        </div>
        <div className="ysa-payment-column">
          <strong>We accept</strong>
          <div>
            <span>VISA</span>
            <span>●●</span>
            <span>PayPal</span>
          </div>
          <small>
            <ShieldCheck aria-hidden="true" /> Trusted by buyers worldwide
          </small>
        </div>
      </div>
      <div className="ysa-mobile-footer-groups">
        {["Marketplace", "Sell", "Help", "Legal"].map((label) => (
          <details key={label}>
            <summary>{label}</summary>
            <Link to="/catalog">Browse ysello</Link>
            <Link to="/support">Learn more</Link>
          </details>
        ))}
      </div>
      <div className="ysa-footer-bottom">
        <span>© 2026 ysello.com. All rights reserved.</span>
        <span>
          <ShieldCheck aria-hidden="true" /> Protected digital marketplace
        </span>
      </div>
    </footer>
  );
}

export function MarketplaceHomePage() {
  const navigate = useNavigate();
  const apiProducts = useMarketplaceProducts();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const products = useMemo(() => {
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    return [...apiProducts, ...catalogProducts].filter((product) => {
      if (seenIds.has(product.id) || seenSlugs.has(product.slug)) return false;
      seenIds.add(product.id);
      seenSlugs.add(product.slug);
      return true;
    });
  }, [apiProducts]);
  const trendingProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            b.reviews - a.reviews ||
            Number(String(b.sales).replace(/[^0-9.]/g, "")) -
              Number(String(a.sales).replace(/[^0-9.]/g, "")),
        )
        .slice(0, 6),
    [products],
  );

  const newProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.id.localeCompare(a.id))
        .filter(
          (product) =>
            !trendingProducts.some((trending) => trending.id === product.id),
        )
        .slice(0, 6),
    [products, trendingProducts],
  );

  function submitHeroSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/catalog${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  function submitNewsletter(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  }

  return (
    <main className="ysa-page">
      <Seo
        title="ysello.com — Everything digital. One trusted marketplace."
        description="Discover digital products, games, AI tools, software and more from verified sellers."
        canonicalPath="/"
      />
      <HomeHeader />

      <section className="ysa-hero">
        <div className="ysa-hero-copy">
          <h1>
            Everything digital.
            <br />
            One trusted
            <br />
            marketplace.
          </h1>
          <p>
            Discover accounts, games, AI tools, software and more — delivered
            instantly.
          </p>
          <div className="ysa-hero-actions">
            <Link className="ysa-primary-button" to="/catalog">
              Explore marketplace
            </Link>
            <Link className="ysa-secondary-button" to="/seller/apply">
              Become a seller
            </Link>
          </div>
        </div>
        <MarketplaceHeroArt />
      </section>

      <form className="ysa-hero-search" onSubmit={submitHeroSearch}>
        <Search aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search accounts, games, AI tools and more"
          placeholder="Search accounts, games, AI tools and more"
        />
        <button type="submit">Search</button>
      </form>

      <section className="ysa-trust-strip" aria-label="Marketplace benefits">
        {[
          {
            value: "10K+",
            title: "digital products",
            text: "Across every category",
            icon: Box,
            tone: "blue",
          },
          {
            value: "Verified sellers",
            title: "All sellers are verified",
            text: "Shop with confidence",
            icon: BadgeCheck,
            tone: "green",
          },
          {
            value: "Instant delivery",
            title: "Get what you bought",
            text: "Delivered within seconds",
            icon: Zap,
            tone: "violet",
          },
          {
            value: "Buyer protection",
            title: "Protected checkout",
            text: "Support on every order",
            icon: ShieldCheck,
            tone: "coral",
          },
        ].map(({ value, title, text, icon: Icon, tone }) => (
          <article key={value} className={`ysa-tone-${tone}`}>
            <span>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <strong>{value}</strong>
              <small>{title}</small>
              <em>{text}</em>
            </div>
          </article>
        ))}
      </section>

      <section className="ysa-section" id="categories">
        <div className="ysa-section-heading">
          <h2>Browse popular categories</h2>
          <Link to="/catalog">
            View all categories <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ysa-category-grid">
          {homeCategories.map(
            ({ name, description, href, tone, icon: Icon }) => (
              <Link
                className={`ysa-category-card ysa-tone-${tone}`}
                to={href}
                key={name}
              >
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <strong>{name}</strong>
                <small>{description}</small>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="ysa-section">
        <div className="ysa-section-heading">
          <h2>Trending right now</h2>
          <Link to="/catalog">
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ysa-product-grid">
          {trendingProducts.map((product) => (
            <HomeProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="ysa-seller-banner">
        <div className="ysa-seller-copy">
          <h2>
            Built for
            <br />
            digital commerce
          </h2>
          <p>
            Start your digital business on ysello.com and reach thousands of
            ready-to-buy customers.
          </p>
          <div className="ysa-seller-benefits">
            {[
              [Coins, "Low fees", "Keep more of what you earn"],
              [Globe2, "Global reach", "Sell to buyers worldwide"],
              [Store, "Powerful tools", "Manage listings with ease"],
              [Zap, "Fast payouts", "Get paid securely and on time"],
            ].map(([Icon, title, text]) => {
              const BenefitIcon = Icon as LucideIcon;
              return (
                <span key={String(title)}>
                  <BenefitIcon aria-hidden="true" />
                  <strong>{String(title)}</strong>
                  <small>{String(text)}</small>
                </span>
              );
            })}
          </div>
          <Link className="ysa-banner-button" to="/seller/apply">
            Open your store
          </Link>
        </div>
        <SellerDashboardPreview />
      </section>

      <section className="ysa-section ysa-platform-section">
        <div className="ysa-section-heading">
          <h2>Explore by platform</h2>
        </div>
        <div className="ysa-platform-row">
          {platformItems.map(({ label, count, icon: Icon }) => (
            <Link to={`/catalog?q=${encodeURIComponent(label)}`} key={label}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{count}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ysa-section">
        <div className="ysa-section-heading">
          <h2>New arrivals</h2>
          <Link to="/catalog">
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ysa-product-grid">
          {newProducts.map((product) => (
            <HomeProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="ysa-section">
        <div className="ysa-section-heading">
          <h2>Why shop on ysello.com?</h2>
        </div>
        <div className="ysa-benefit-grid">
          {benefits.map(({ title, text, tone, icon: Icon }) => (
            <article className={`ysa-tone-${tone}`} key={title}>
              <span>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ysa-section">
        <div className="ysa-section-heading">
          <h2>Loved by thousands of buyers</h2>
          <Link to="/catalog">
            View all <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ysa-testimonial-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <p>“{testimonial.quote}”</p>
              <div>
                <span>{testimonial.initials}</span>
                <strong>{testimonial.name}</strong>
                <i aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} fill="currentColor" aria-hidden="true" />
                  ))}
                </i>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ysa-section ysa-faq-section">
        <div className="ysa-section-heading">
          <h2>Frequently asked questions</h2>
          <Link to="/support">
            View all FAQs <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="ysa-faq-list">
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

      <section className="ysa-newsletter">
        <span>
          {subscribed ? (
            <Check aria-hidden="true" />
          ) : (
            <ShoppingBag aria-hidden="true" />
          )}
        </span>
        <div>
          <strong>
            {subscribed
              ? "You’re on the list!"
              : "Stay updated with the best deals"}
          </strong>
          <small>
            {subscribed
              ? "Watch your inbox for new arrivals and offers."
              : "Subscribe to get exclusive offers and new arrivals."}
          </small>
        </div>
        <form onSubmit={submitNewsletter}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            aria-label="Email address"
            required
          />
          <button type="submit">Subscribe</button>
        </form>
      </section>

      <HomeFooter />
    </main>
  );
}

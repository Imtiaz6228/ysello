import {
  BadgeCheck,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  Heart,
  Menu,
  PackageOpen,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { productPath } from "../commerce/marketplaceUrls";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";
import {
  MarketplaceBrandArtwork,
  YselloMarketplaceArtwork,
  detectMarketplaceBrandSlug,
} from "./MarketplaceBrandIcon";

export function YselloReferenceHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const accountPath = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";

  useEffect(() => {
    setMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.hash]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/catalog${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <header className="ys-ref-header">
      <div className="ys-ref-announcement">
        <span>
          <Zap aria-hidden="true" /> Instant delivery
        </span>
        <span>•</span>
        <span>Verified sellers</span>
        <span>•</span>
        <span>Buyer protection</span>
      </div>
      <div className="ys-ref-nav">
        <Link className="ys-ref-wordmark" to="/" aria-label="Ysello home">
          <strong>ysello</strong>
          <span>.com</span>
        </Link>
        <nav className="ys-ref-desktop-links" aria-label="Primary navigation">
          <Link to="/catalog">Marketplace</Link>
          <Link to="/#categories">Categories</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/seller/apply">Become a Seller</Link>
        </nav>
        <form className="ys-ref-global-search" onSubmit={submitSearch}>
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search accounts, games, AI tools and digital products"
            placeholder="Search accounts, games, AI tools and more"
          />
        </form>
        <div className="ys-ref-desktop-actions">
          <Link to={accountPath}>{user ? "Account" : "Sign In"}</Link>
          <Link
            className="ys-ref-primary-button"
            to={user ? accountPath : "/register"}
          >
            {user ? "Dashboard" : "Get Started"}
          </Link>
          <Link
            className="ys-ref-cart-button"
            to="/cart"
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingBag aria-hidden="true" />
            {count ? <b>{count}</b> : null}
          </Link>
        </div>
        <div className="ys-ref-mobile-actions">
          <button
            type="button"
            aria-label="Search"
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <Search aria-hidden="true" />
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
      {mobileSearchOpen ? (
        <form className="ys-ref-mobile-search" onSubmit={submitSearch}>
          <Search aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search marketplace"
            placeholder="Search products"
          />
          <button type="submit">Search</button>
        </form>
      ) : null}
      {menuOpen ? (
        <>
          <button
            type="button"
            className="ys-ref-menu-scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="ys-ref-mobile-menu" aria-label="Mobile navigation">
            <div>
              <Link className="ys-ref-wordmark" to="/">
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
            <Link to="/">Home</Link>
            <Link to="/catalog">Marketplace</Link>
            <Link to="/#categories">Categories</Link>
            <Link to="/#how-it-works">How It Works</Link>
            <Link to="/seller/apply">Become a Seller</Link>
            <Link to="/buyer-protection">Buyer Protection</Link>
            <Link to="/cart">
              Cart <span>{count}</span>
            </Link>
            <Link
              className="ys-ref-primary-button"
              to={user ? accountPath : "/register"}
            >
              {user ? "Dashboard" : "Get Started"}
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  );
}

export function YselloReferenceFooter() {
  return (
    <footer className="ys-ref-footer">
      <section className="ys-ref-footer-cta">
        <div>
          <ShoppingBag aria-hidden="true" />
          <span>
            <strong>Ready to Find Your Next Digital Product?</strong>
            <small>Browse trusted listings across every category.</small>
          </span>
        </div>
        <Link className="ys-ref-primary-button" to="/catalog">
          Browse Marketplace <ChevronRight aria-hidden="true" />
        </Link>
      </section>
      <div className="ys-ref-footer-grid">
        <div className="ys-ref-footer-brand">
          <Link className="ys-ref-wordmark" to="/">
            <strong>ysello</strong>
            <span>.com</span>
          </Link>
          <p>
            A trusted marketplace for digital products, gaming, AI tools and
            professional services.
          </p>
          <span>
            <ShieldCheck aria-hidden="true" /> Protected marketplace checkout
          </span>
        </div>
        <div>
          <strong>Marketplace</strong>
          <Link to="/catalog">All Products</Link>
          <Link to="/#categories">Categories</Link>
          <Link to="/#products">Trending Now</Link>
          <Link to="/#sellers">Top Sellers</Link>
        </div>
        <div>
          <strong>Sell</strong>
          <Link to="/seller/apply">Become a Seller</Link>
          <Link to="/seller">Seller Dashboard</Link>
          <Link to="/seller-policy">Seller Policy</Link>
          <Link to="/support">Seller Support</Link>
        </div>
        <div>
          <strong>Support</strong>
          <Link to="/support">Help Center</Link>
          <Link to="/buyer-protection">Buyer Protection</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/terms">Terms & Safety</Link>
        </div>
        <div>
          <strong>Company</strong>
          <Link to="/about">About Us</Link>
          <Link to="/blog">Guides</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/copyright">Copyright</Link>
        </div>
      </div>
      <div className="ys-ref-footer-bottom">
        <span>© 2026 ysello.com. All rights reserved.</span>
        <span>Visa · Mastercard · PayPal · Apple Pay · Google Pay</span>
      </div>
    </footer>
  );
}

type ProductCardProps = {
  product: CatalogProduct;
  onBuy?: (product: CatalogProduct) => void;
  layout?: "grid" | "list";
};

function productTone(product: CatalogProduct) {
  const key = `${product.category} ${product.title}`.toLowerCase();
  if (
    key.includes("social") ||
    key.includes("instagram") ||
    key.includes("tiktok")
  )
    return "social";
  if (key.includes("game") || key.includes("steam") || key.includes("valorant"))
    return "gaming";
  if (
    key.includes("ai") ||
    key.includes("chatgpt") ||
    key.includes("midjourney")
  )
    return "ai";
  if (key.includes("stream") || key.includes("netflix")) return "streaming";
  return "digital";
}

export function YselloReferenceProductCard({
  product,
  onBuy,
  layout = "grid",
}: ProductCardProps) {
  const { formatMoney, formatProductMoney } = useLocale();
  const [saved, setSaved] = useState(false);
  const categoryParts = product.category.split(" / ");
  const categoryLabel =
    categoryParts[categoryParts.length - 1] ?? product.category;
  const canPurchase =
    product.type === "SERVICE" ||
    (product.stockCount ?? 0) >= (product.minimumOrder ?? 1);
  const ProductIcon =
    product.type === "SERVICE" ? BriefcaseBusiness : PackageOpen;
  const platform =
    typeof product.facts?.platform === "string"
      ? product.facts.platform
      : product.type === "SERVICE"
        ? "Seller service"
        : "Digital download";
  const region =
    typeof product.facts?.region === "string"
      ? product.facts.region.trim()
      : "";
  const secondaryFact =
    product.type === "SERVICE"
      ? "SERVICE"
      : region && region.toUpperCase() !== "GLOBAL"
        ? region
        : null;
  const originalPrice =
    product.originalPriceCents &&
    product.originalPriceCents > product.priceCents
      ? product.originalPriceCents
      : null;
  const discount = originalPrice
    ? Math.round((1 - product.priceCents / originalPrice) * 100)
    : 0;
  const availableQuantity =
    product.type === "SERVICE" ? null : Math.max(0, product.stockCount ?? 0);
  const supplierFulfilled = product.attributes?.supplierFulfilled === true;
  const brandSlug = supplierFulfilled
    ? detectMarketplaceBrandSlug(platform, product.category, product.title)
    : null;

  return (
    <article
      className={`ys-ref-product-card g2-product-card ${layout} tone-${productTone(product)}`}
    >
      <span className="g2-card-offer">
        <BadgeCheck aria-hidden="true" />{" "}
        {product.isOfficial ? "Official" : "Verified seller"} · {product.seller}
      </span>
      <div className="ys-ref-product-media g2-product-media">
        {!canPurchase ? (
          <span className="product-sold-out-ribbon">SOLD OUT</span>
        ) : null}
        <Link
          className="g2-product-image-link"
          to={productPath(product)}
          aria-label={`View ${product.title}`}
        >
          {supplierFulfilled ? (
            brandSlug ? (
              <MarketplaceBrandArtwork
                brandSlug={brandSlug}
                className="ys-product-native-brand"
              />
            ) : (
              <YselloMarketplaceArtwork
                label={categoryLabel}
                className="ys-product-native-brand"
              />
            )
          ) : product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              decoding="async"
              width="640"
              height="480"
            />
          ) : (
            <span className="ys-ref-product-symbol" aria-hidden="true">
              <i>{product.icon || <ProductIcon />}</i>
              <small>{categoryLabel}</small>
            </span>
          )}
        </Link>
        <button
          type="button"
          className={saved ? "saved" : ""}
          aria-label={saved ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <Heart fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
      <div className="ys-ref-product-copy g2-product-copy">
        <Link className="ys-ref-product-title" to={productPath(product)}>
          {product.title}
        </Link>
        <p className="g2-product-description">{product.description}</p>
        <div className="g2-product-facts">
          <span>
            <Zap aria-hidden="true" /> {platform}
          </span>
          {secondaryFact ? <span>{secondaryFact}</span> : null}
        </div>
        <div className="ys-ref-product-meta g2-product-meta product-commerce-metrics">
          <span>
            <Star fill="currentColor" aria-hidden="true" />{" "}
            <b>{product.rating || "New"}</b>
            <small>{product.reviews} ratings</small>
          </span>
          <span>
            <BarChart3 aria-hidden="true" />
            <b>{product.sales || "0"}</b>
            <small>total sales</small>
          </span>
          <span className={canPurchase ? "" : "sold-out"}>
            <Boxes aria-hidden="true" />
            <b>
              {product.type === "SERVICE"
                ? "Open"
                : availableQuantity === 0
                  ? "Sold out"
                  : availableQuantity}
            </b>
            <small>
              {product.type === "SERVICE" ? "service slots" : "available"}
            </small>
          </span>
        </div>
        <div className="ys-ref-product-price-row g2-product-price-row">
          <div>
            <strong>{formatProductMoney(product)}</strong>
            {originalPrice ? <small>{formatMoney(originalPrice)}</small> : null}
          </div>
          {discount ? <b>-{discount}%</b> : null}
        </div>
        <div className="g2-product-stock">
          <span>{product.delivery || "Delivery shown at checkout"}</span>
        </div>
        <div className="ys-ref-product-card-actions g2-product-actions">
          <Link to={productPath(product)}>View details</Link>
          {onBuy ? (
            <button
              type="button"
              disabled={!canPurchase}
              onClick={() => onBuy(product)}
            >
              <ShoppingBag aria-hidden="true" />
              {canPurchase ? "Buy now" : "Sold out"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

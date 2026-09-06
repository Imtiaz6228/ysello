import { UiText } from "../i18n/UiText";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Grid2X2,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { useMarketplaceCategories } from "../commerce/useMarketplace";
import { categoryPath } from "../commerce/marketplaceUrls";
import { storefrontCategories } from "../commerce/storefrontCategories";
import {
  identifyProductPlatform,
  platformImage,
} from "../data/platformIdentity";
import { useLocale } from "../i18n/LocaleContext";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function MarketHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLocale();
  const categories = useMarketplaceCategories();
  const populated = storefrontCategories(categories);
  const navigate = useNavigate();
  const location = useLocation();
  const categoryMenu = useRef<HTMLDetailsElement>(null);
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const account = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";
  useEffect(() => {
    if (categoryMenu.current) categoryMenu.current.open = false;
    if (mobileMenu.current) mobileMenu.current.open = false;
  }, [location.pathname, location.search]);
  function categoryLink(category: (typeof categories)[number]) {
    const platform = identifyProductPlatform(category.name, category.slug);
    return (
      <Link key={category.slug} to={categoryPath(category, categories)}>
        {platform ? (
          <img src={platformImage(platform)} width="24" height="24" alt="" />
        ) : (
          <Store />
        )}
        <span>
          <UiText value={category.name} />
        </span>
      </Link>
    );
  }
  return (
    <header className="ys-header">
      <div className="ys-header-announcement">
        Digital products. Clear details. Support with every order.
        <Link to="/support">
          Help center <ArrowRight />
        </Link>
      </div>
      <div className="ys-header-main">
        <Link className="ys-header-logo" to="/" aria-label="Ysello home">
          <img src="/ysello-mark.svg" width="42" height="42" alt="" />
          <strong>
            ysello<span>digital marketplace</span>
          </strong>
        </Link>
        <form
          className="ys-header-search"
          onSubmit={(event) => {
            event.preventDefault();
            const q = new FormData(event.currentTarget)
              .get("q")
              ?.toString()
              .trim();
            navigate(`/catalog${q ? `?q=${encodeURIComponent(q)}` : ""}`);
          }}
        >
          <Search />
          <input
            name="q"
            type="search"
            placeholder="Search accounts, subscriptions and more"
            aria-label="Search marketplace"
          />
          <button type="submit">
            <UiText value="Search" />
          </button>
        </form>
        <div className="ys-header-actions">
          <LocaleSwitcher compact />
          <Link to={account}>
            <UserRound />
            <span>{user ? t("account") : t("signIn")}</span>
          </Link>
          <Link to="/cart" aria-label={`Cart with ${count} items`}>
            <ShoppingCart />
            {count ? <b>{count}</b> : null}
          </Link>
        </div>
        <details className="ys-header-mobile-menu" ref={mobileMenu}>
          <summary aria-label="Navigation menu">
            <Menu />
          </summary>
          <nav>
            <Link to="/catalog">
              <UiText value="All products" />
            </Link>
            <Link to={account}>{user ? "My account" : "Sign in"}</Link>
            {!user ? (
              <Link to="/register">Create account</Link>
            ) : (
              <Link to="/sign-out">
                <UiText value="Sign out" />
              </Link>
            )}
            <Link to="/#top-stores">Stores</Link>
            <Link to="/seller/apply">Become a seller</Link>
            <Link to="/support">
              <UiText value="Support" />
            </Link>
          </nav>
        </details>
      </div>
      <div className="ys-header-navigation">
        <details ref={categoryMenu} className="ys-header-category-menu">
          <summary>
            <Grid2X2 />
            <UiText value="Categories" />
            <ChevronDown />
          </summary>
          <nav aria-label="All stocked categories">
            <Link to="/catalog">
              <Store />
              <UiText value="All products" />
            </Link>
            {populated.map(categoryLink)}
          </nav>
        </details>
        <nav className="ys-header-shortcuts" aria-label="Popular categories">
          {populated.slice(0, 6).map(categoryLink)}
        </nav>
        <Link className="ys-header-stores" to="/#top-stores">
          Stores <ArrowRight />
        </Link>
      </div>
    </header>
  );
}

export function MarketFooter() {
  const { t } = useLocale();
  return (
    <footer className="market-site-footer g2-site-footer">
      <div className="g2-payment-row">
        <div>
          <strong>VISA</strong>
          <strong>mastercard</strong>
          <strong>PayPal</strong>
          <span>and other secure payment methods at checkout</span>
        </div>
        <LocaleSwitcher />
      </div>

      <div className="market-footer-grid g2-footer-grid">
        <div>
          <strong>
            <UiText value="About" />
          </strong>
          <Link to="/about">Company</Link>
          <Link to="/catalog">{t("products")}</Link>
          <Link to="/buyer-protection">Marketplace security</Link>
          <Link to="/contact">
            <UiText value="Contact" />
          </Link>
        </div>
        <div>
          <strong>For buyers</strong>
          <Link to="/support">Buyer support</Link>
          <Link to="/catalog">How to buy</Link>
          <Link to="/buyer-protection">{t("protection")}</Link>
          <Link to="/blog">{t("blog")}</Link>
        </div>
        <div>
          <strong>For sellers</strong>
          <Link to="/support">Seller support</Link>
          <Link to="/seller/apply">How to sell</Link>
          <Link to="/seller">{t("dashboard")}</Link>
          <Link to="/seller-policy">
            <UiText value="Seller policy" />
          </Link>
        </div>
        <div>
          <strong>Support & legal</strong>
          <Link to="/terms">Terms and conditions</Link>
          <Link to="/privacy">Privacy and cookies</Link>
          <Link to="/refund-policy">
            <UiText value="Refund policy" />
          </Link>
          <Link to="/prohibited-products">
            <UiText value="Prohibited products" />
          </Link>
        </div>
        <div>
          <strong>Discover</strong>
          <Link to="/blog">{t("blog")}</Link>
          <Link to="/catalog?sort=newest">{t("releases")}</Link>
          <Link to="/catalog?sort=popular">{t("popularNow")}</Link>
          <Link to="/#categories">Category map</Link>
        </div>
        <div className="g2-footer-brand">
          <Link className="market-wordmark" to="/">
            <img src="/ysello-mark.svg" alt="" width="44" height="44" />
            <span>
              <strong>ysello</strong>
              <small>digital marketplace</small>
            </span>
          </Link>
          <p>
            Digital products and professional services from verified marketplace
            sellers.
          </p>
          <span>
            <BadgeCheck aria-hidden="true" /> Verified listings
          </span>
          <span>
            <ShieldCheck aria-hidden="true" /> {t("protectedCheckout")}
          </span>
        </div>
      </div>

      <section className="g2-footer-entities">
        <div>
          <strong>Ysello marketplace</strong>
          <span>Digital goods, creative resources and expert services.</span>
        </div>
        <div>
          <strong>Buyer-first commerce</strong>
          <span>Clear seller, delivery, price and product information.</span>
        </div>
        <div>
          <strong>Seller tools</strong>
          <span>Upload once and publish across every marketplace surface.</span>
        </div>
      </section>

      <div className="market-footer-bottom g2-footer-bottom">
        <span>© 2026 ysello.com. All rights reserved.</span>
        <span>
          <Clock3 aria-hidden="true" /> Always-on marketplace ·{" "}
          <LifeBuoy aria-hidden="true" /> Order-linked support
        </span>
      </div>
    </footer>
  );
}

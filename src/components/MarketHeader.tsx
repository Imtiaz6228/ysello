import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock3,
  LifeBuoy,
  Menu,
  PackageSearch,
  Grid2X2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { marketplaceTaxonomy } from "../data/marketplaceTaxonomy";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

const trustItems = [
  { label: "Instant delivery", icon: Zap },
  { label: "Protected checkout", icon: ShieldCheck },
  { label: "Verified sellers", icon: BadgeCheck },
  { label: "Human support", icon: LifeBuoy },
];

export function MarketHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const accountPath = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";

  useEffect(() => {
    setCategoriesOpen(false);
    setMenuOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!menuOpen && !categoriesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (!menuOpen || event.key !== "Tab") return;
      const controls = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [categoriesOpen, menuOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    navigate(`/catalog${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  }

  return (
    <header className="market-shell-header">
      <div className="market-trust-strip" aria-label="Marketplace assurances">
        <div>
          {trustItems.map(({ label, icon: Icon }) => (
            <span key={label}>
              <Icon aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="market-main-nav">
        <Link className="market-wordmark" to="/" aria-label="Ysello home">
          <img src="/ysello-mark.svg" alt="" width="40" height="40" />
          <span>
            <strong>ysello</strong>
            <small>digital marketplace</small>
          </span>
        </Link>

        <nav className="market-desktop-links" aria-label="Primary navigation">
          <Link to="/catalog">Browse</Link>
          <button
            type="button"
            aria-expanded={categoriesOpen}
            aria-controls="market-category-menu"
            onClick={() => setCategoriesOpen((open) => !open)}
          >
            <span>{t("categories")}</span> <ChevronDown aria-hidden="true" />
          </button>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/seller/apply">Start Selling</Link>
          <Link to="/support">Support</Link>
        </nav>

        <form
          className="market-header-search commerce-global-search"
          onSubmit={submitSearch}
        >
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search templates, tools, assets and services"
            placeholder="Search marketplace"
          />
          <button type="submit" aria-label="Search marketplace">
            <ArrowRight aria-hidden="true" />
          </button>
        </form>

        <div className="market-header-actions">
          <Link className="market-sign-in" to={accountPath}>
            <UserRound aria-hidden="true" />
            <span>{user ? "Account" : "Sign In"}</span>
          </Link>
          <Link
            className="market-cart-button"
            to="/cart"
            aria-label={`Cart with ${count} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag aria-hidden="true" />
            <span>Cart</span>
            {count ? <b>{count}</b> : null}
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          className="market-mobile-menu-button"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>
      </div>

      <nav
        className="market-department-bar"
        aria-label="Marketplace departments"
      >
        <Link className="market-department-all" to="/catalog">
          <Grid2X2 aria-hidden="true" /> All products
        </Link>
        {marketplaceTaxonomy.slice(0, 6).map((category) => (
          <Link key={category.slug} to={`/categories/${category.slug}`}>
            {category.name}
          </Link>
        ))}
        <Link className="market-department-hot" to="/catalog?sort=popular">
          Hot deals <span>HOT</span>
        </Link>
      </nav>

      {categoriesOpen ? (
        <div className="market-category-layer">
          <button
            className="market-category-scrim"
            type="button"
            aria-label="Close categories"
            onClick={() => setCategoriesOpen(false)}
          />
          <section
            id="market-category-menu"
            className="market-category-menu"
            aria-label="Marketplace categories"
          >
            <header>
              <div>
                <span>Browse by category</span>
                <strong>Find the right digital resource.</strong>
              </div>
              <Link to="/catalog">
                View all categories <ArrowRight aria-hidden="true" />
              </Link>
            </header>
            <div>
              {marketplaceTaxonomy.map((category) => (
                <Link
                  to={`/categories/${category.slug}`}
                  key={category.slug}
                  className={`taxonomy-link tone-${category.accent}`}
                >
                  <i aria-hidden="true">{category.icon}</i>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.description}</small>
                    <em>
                      {category.subcategories
                        .slice(0, 2)
                        .map((item) => item.name)
                        .join(" · ")}
                    </em>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {menuOpen ? (
        <>
          <button
            className="market-mobile-scrim"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            ref={drawerRef}
            className="market-mobile-drawer"
            aria-label="Mobile navigation"
          >
            <header>
              <Link className="market-wordmark" to="/">
                <img src="/ysello-mark.svg" alt="" width="38" height="38" />
                <span>
                  <strong>ysello</strong>
                  <small>digital marketplace</small>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <form onSubmit={submitSearch}>
              <Search aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search marketplace"
                placeholder="Search tools, assets and services"
              />
            </form>
            <Link to="/catalog">
              <PackageSearch aria-hidden="true" /> Marketplace
            </Link>
            <Link to="/#categories">All categories</Link>
            <Link to="/#products">
              <Grid2X2 aria-hidden="true" /> Products
            </Link>
            <Link to="/#how-it-works">How Ysello works</Link>
            <Link to="/seller/apply">Start selling</Link>
            <Link to="/buyer-protection">Buyer protection</Link>
            <Link to="/support">Support center</Link>
            <Link to="/cart">
              Cart <span>{count}</span>
            </Link>
            <Link className="market-mobile-account" to={accountPath}>
              {user ? "Open account" : "Sign in"}
            </Link>
            <div className="market-mobile-locale">
              <LocaleSwitcher />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}

export function MarketFooter() {
  return (
    <footer className="market-site-footer">
      <section className="market-footer-promise">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Buy with confidence.</strong>
            <small>
              Clear listing details, protected checkout and order-linked
              support.
            </small>
          </span>
        </div>
        <Link to="/buyer-protection">
          Read buyer protection <ArrowRight aria-hidden="true" />
        </Link>
      </section>

      <div className="market-footer-grid">
        <div className="market-footer-brand">
          <Link className="market-wordmark" to="/">
            <img src="/ysello-mark.svg" alt="" width="42" height="42" />
            <span>
              <strong>ysello</strong>
              <small>digital marketplace</small>
            </span>
          </Link>
          <p>
            Licensed digital goods and professional services from verified
            marketplace sellers.
          </p>
          <span>
            <Clock3 aria-hidden="true" /> Payment options are shown securely at
            checkout.
          </span>
        </div>
        <div>
          <strong>Marketplace</strong>
          <Link to="/catalog">Browse all</Link>
          <Link to="/#categories">Categories</Link>
          <Link to="/#products">Featured products</Link>
          <Link to="/#professional-services">Digital services</Link>
        </div>
        <div>
          <strong>For sellers</strong>
          <Link to="/seller/apply">Open your store</Link>
          <Link to="/seller">Seller dashboard</Link>
          <Link to="/seller-policy">Seller policy</Link>
          <Link to="/support">Seller support</Link>
        </div>
        <div>
          <strong>Buyer support</strong>
          <Link to="/buyer-protection">Buyer protection</Link>
          <Link to="/refund-policy">Refund policy</Link>
          <Link to="/support">Support center</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <strong>Company & legal</strong>
          <Link to="/about">About Ysello</Link>
          <Link to="/blog">Guides</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/prohibited-products">Prohibited products</Link>
          <Link to="/copyright">Copyright</Link>
        </div>
      </div>

      <div className="market-footer-bottom">
        <span>© 2026 ysello.com. All rights reserved.</span>
        <span>
          <Store aria-hidden="true" /> Verified sellers ·{" "}
          <ShieldCheck aria-hidden="true" /> Protected checkout
        </span>
      </div>
    </footer>
  );
}

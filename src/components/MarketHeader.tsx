import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  Code2,
  Grid2X2,
  Heart,
  LifeBuoy,
  Menu,
  MonitorDown,
  PackageSearch,
  Palette,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  UserRound,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STAFF_ROLES } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import {
  marketplaceTaxonomy,
  type MarketplaceTaxonomyItem,
} from "../data/marketplaceTaxonomy";
import { useLocale } from "../i18n/LocaleContext";
import { LocaleSwitcher } from "./LocaleSwitcher";

const categoryIcons: Record<string, LucideIcon> = {
  "ai-tools-workflows": Bot,
  "design-creative-assets": Palette,
  "software-productivity": MonitorDown,
  "website-themes-plugins": Code2,
  "video-streaming-assets": Video,
  "business-marketing-kits": BriefcaseBusiness,
  "learning-resources-guides": Boxes,
  "professional-digital-services": Sparkles,
};

const departmentLabels: Record<string, string> = {
  "ai-tools-workflows": "AI tools",
  "design-creative-assets": "Creative",
  "software-productivity": "Software",
  "website-themes-plugins": "Web assets",
  "video-streaming-assets": "Video",
  "business-marketing-kits": "Business",
  "learning-resources-guides": "Learning",
  "professional-digital-services": "Services",
};

function DepartmentIcon({ category }: { category: MarketplaceTaxonomyItem }) {
  const Icon = categoryIcons[category.slug] ?? Grid2X2;
  return <Icon aria-hidden="true" />;
}

function MegaMenu({
  category,
  onClose,
}: {
  category: MarketplaceTaxonomyItem;
  onClose: () => void;
}) {
  const companionDepartments = marketplaceTaxonomy
    .filter((item) => item.slug !== category.slug)
    .slice(0, 5);

  return (
    <section
      id="market-category-menu"
      className="g2-mega-menu"
      aria-label={`${category.name} menu`}
    >
      <div className="g2-mega-inner">
        <div className="g2-mega-lead">
          <span className={`g2-mega-icon tone-${category.accent}`}>
            <DepartmentIcon category={category} />
          </span>
          <p>Explore department</p>
          <h2>{category.name}</h2>
          <span>{category.description}</span>
          <Link to={`/categories/${category.slug}`} onClick={onClose}>
            Shop all {departmentLabels[category.slug] ?? category.name}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="g2-mega-column">
          <strong>Featured categories</strong>
          {category.subcategories.map((subcategory) => (
            <Link
              key={subcategory.slug}
              to={`/categories/${subcategory.slug}`}
              onClick={onClose}
            >
              <span>{subcategory.name}</span>
              <small>{subcategory.description}</small>
            </Link>
          ))}
        </div>

        <div className="g2-mega-column">
          <strong>Shop by format</strong>
          <Link to={`/categories/${category.slug}`} onClick={onClose}>
            All digital products
          </Link>
          <Link
            to={`/catalog?category=${category.slug}&kind=DOWNLOAD`}
            onClick={onClose}
          >
            Instant downloads
          </Link>
          <Link
            to={`/catalog?category=${category.slug}&kind=SERVICE`}
            onClick={onClose}
          >
            Professional services
          </Link>
          <Link
            to={`/catalog?category=${category.slug}&sort=popular`}
            onClick={onClose}
          >
            Bestselling now
          </Link>
          <Link
            to={`/catalog?category=${category.slug}&sort=newest`}
            onClick={onClose}
          >
            New releases
          </Link>
        </div>

        <div className="g2-mega-column">
          <strong>More departments</strong>
          {companionDepartments.map((item) => (
            <Link
              key={item.slug}
              to={`/categories/${item.slug}`}
              onClick={onClose}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <Link
          className={`g2-mega-promo tone-${category.accent}`}
          to={`/categories/${category.slug}`}
          onClick={onClose}
        >
          <span>Curated marketplace</span>
          <strong>Verified resources for your next project.</strong>
          <small>Clear licensing, delivery terms and seller details.</small>
          <i>
            Discover all <ArrowRight aria-hidden="true" />
          </i>
        </Link>
      </div>
    </section>
  );
}

export function MarketHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState<string | null>(null);
  const [promoVisible, setPromoVisible] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const accountPath = user
    ? STAFF_ROLES.includes(user.role)
      ? "/admin"
      : user.role === "SELLER"
        ? "/seller"
        : "/dashboard"
    : "/sign-in";
  const activeCategory =
    marketplaceTaxonomy.find((category) => category.slug === activeMega) ??
    null;

  useEffect(() => {
    setActiveMega(null);
    setMenuOpen(false);
    setMobileCategory(null);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen && !activeMega) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMega(null);
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
  }, [activeMega, menuOpen]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    const value = query.trim();
    if (value) params.set("q", value);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    navigate(`/catalog${params.size ? `?${params.toString()}` : ""}`);
    setMenuOpen(false);
  }

  function toggleMega(slug: string) {
    setActiveMega((current) => (current === slug ? null : slug));
  }

  return (
    <header className="market-shell-header g2-market-header">
      {promoVisible ? (
        <div className="g2-campaign-banner">
          <p>
            <b>Ysello</b>
            <strong>Editor’s picks</strong>
            <span>Fresh digital tools, assets and services</span>
          </p>
          <Link to="/catalog?sort=popular">Explore bestsellers</Link>
          <button
            type="button"
            aria-label="Close promotion"
            onClick={() => setPromoVisible(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="g2-header-dark">
        <div className="market-main-nav g2-main-nav">
          <Link
            className="market-wordmark market-wordmark--header"
            to="/"
            aria-label="Ysello home"
          >
            <img src="/ysello-mark.svg" alt="" width="46" height="46" />
            <span>
              <strong>ysello</strong>
            </span>
          </Link>

          <form
            className="market-header-search commerce-global-search g2-header-search"
            onSubmit={submitSearch}
          >
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search digital tools, assets and services"
              placeholder="What are you looking for?"
            />
            <label>
              <span className="sr-only">Search category</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                aria-label="Search category"
              >
                <option value="all">All categories</option>
                {marketplaceTaxonomy.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
            <button type="submit" aria-label="Search marketplace">
              <Search aria-hidden="true" />
            </button>
          </form>

          <div className="market-header-actions g2-header-actions">
            <div className="g2-header-locale">
              <LocaleSwitcher compact />
            </div>
            <Link className="market-sign-in" to={accountPath}>
              <UserRound aria-hidden="true" />
              <span>
                <small>{user ? "Welcome back" : "Sign in"}</small>
                <strong>{user ? "My account" : "Register"}</strong>
              </span>
            </Link>
            <Link
              className="g2-round-action"
              to={user ? "/dashboard" : "/sign-in"}
              aria-label="Saved items"
            >
              <Heart aria-hidden="true" />
            </Link>
            <Link
              className="market-cart-button g2-round-action"
              to="/cart"
              aria-label={`Cart with ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingCart aria-hidden="true" />
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
          className="market-department-bar g2-department-bar"
          aria-label="Marketplace departments"
        >
          {marketplaceTaxonomy.slice(0, 6).map((category, index) => (
            <button
              key={category.slug}
              type="button"
              className={activeMega === category.slug ? "active" : ""}
              aria-expanded={activeMega === category.slug}
              aria-controls="market-category-menu"
              onClick={() => toggleMega(category.slug)}
              onFocus={() => setActiveMega(category.slug)}
              onMouseEnter={() => setActiveMega(category.slug)}
            >
              <DepartmentIcon category={category} />
              <span>{departmentLabels[category.slug] ?? category.name}</span>
              {index === 2 ? <b>HOT</b> : null}
            </button>
          ))}
          <Link className="g2-department-cta" to="/seller/apply">
            <Store aria-hidden="true" /> Start selling
          </Link>
        </nav>

        {activeCategory ? (
          <div
            className="g2-mega-layer"
            onMouseLeave={() => setActiveMega(null)}
          >
            <MegaMenu
              category={activeCategory}
              onClose={() => setActiveMega(null)}
            />
          </div>
        ) : null}
      </div>

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
            className="market-mobile-drawer g2-mobile-drawer"
            aria-label="Mobile navigation"
          >
            <header>
              <Link className="market-wordmark" to="/">
                <img src="/ysello-mark.svg" alt="" width="42" height="42" />
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

            <form className="g2-mobile-search" onSubmit={submitSearch}>
              <Search aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search marketplace"
                placeholder="Search the marketplace"
              />
              <button type="submit">Search</button>
            </form>

            <div className="g2-mobile-quick-links">
              <Link to="/catalog">
                <PackageSearch aria-hidden="true" /> Marketplace
              </Link>
              <Link to="/#products">
                <Grid2X2 aria-hidden="true" /> Products
              </Link>
              <Link to="/cart">
                <ShoppingCart aria-hidden="true" /> Cart <span>{count}</span>
              </Link>
              <Link to={accountPath}>
                <UserRound aria-hidden="true" /> {user ? "Account" : "Sign in"}
              </Link>
            </div>

            <section className="g2-mobile-categories">
              <div>
                <strong>
                  <span>{t("categories")}</span>
                </strong>
                <Link to="/catalog">View all</Link>
              </div>
              {marketplaceTaxonomy.map((category) => {
                const expanded = mobileCategory === category.slug;
                return (
                  <div className="g2-mobile-category" key={category.slug}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        setMobileCategory(expanded ? null : category.slug)
                      }
                    >
                      <DepartmentIcon category={category} />
                      <span>{category.name}</span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {expanded ? (
                      <div>
                        <Link to={`/categories/${category.slug}`}>
                          All {category.name}
                        </Link>
                        {category.subcategories.map((subcategory) => (
                          <Link
                            key={subcategory.slug}
                            to={`/categories/${subcategory.slug}`}
                          >
                            {subcategory.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <div className="g2-mobile-secondary-links">
              <Link to="/seller/apply">Start selling</Link>
              <Link to="/buyer-protection">Buyer protection</Link>
              <Link to="/support">Support center</Link>
            </div>
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
          <strong>About</strong>
          <Link to="/about">Company</Link>
          <Link to="/catalog">Marketplace</Link>
          <Link to="/buyer-protection">Marketplace security</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <strong>For buyers</strong>
          <Link to="/support">Buyer support</Link>
          <Link to="/catalog">How to buy</Link>
          <Link to="/buyer-protection">Buyer protection</Link>
          <Link to="/blog">Marketplace guides</Link>
        </div>
        <div>
          <strong>For sellers</strong>
          <Link to="/support">Seller support</Link>
          <Link to="/seller/apply">How to sell</Link>
          <Link to="/seller">Seller dashboard</Link>
          <Link to="/seller-policy">Seller policy</Link>
        </div>
        <div>
          <strong>Support & legal</strong>
          <Link to="/terms">Terms and conditions</Link>
          <Link to="/privacy">Privacy and cookies</Link>
          <Link to="/refund-policy">Refund policy</Link>
          <Link to="/prohibited-products">Prohibited products</Link>
        </div>
        <div>
          <strong>Discover</strong>
          <Link to="/blog">News and guides</Link>
          <Link to="/catalog?sort=newest">New releases</Link>
          <Link to="/catalog?sort=popular">Bestsellers</Link>
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
            <ShieldCheck aria-hidden="true" /> Protected checkout
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

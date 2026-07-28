import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Gamepad2,
  Gift,
  Grid2X2,
  Heart,
  LifeBuoy,
  LogOut,
  Menu,
  MonitorDown,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  UserRound,
  UsersRound,
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
  gaming: Gamepad2,
  software: MonitorDown,
  subscriptions: RefreshCw,
  "gift-cards": Gift,
  "social-media": UsersRound,
  outlet: Tags,
};

const departmentLabels: Record<string, string> = {
  gaming: "Gaming",
  software: "Software",
  subscriptions: "Subscriptions",
  "gift-cards": "Gift cards",
  "social-media": "Social media",
  outlet: "OUTLET",
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
  const { t } = useLocale();
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
          <p>{t("exploreDepartment")}</p>
          <h2>{category.name}</h2>
          <span>{category.description}</span>
          <Link to={`/category/${category.slug}`} onClick={onClose}>
            Shop all {departmentLabels[category.slug] ?? category.name}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="g2-mega-catalog-grid">
          {category.subcategories.map((group) => (
            <section key={group.slug}>
              <Link to={`/category/${group.slug}`} onClick={onClose}>
                {group.name}
              </Link>
              {group.children?.map((item) => (
                <Link
                  key={item.slug}
                  to={`/category/${item.slug}`}
                  onClick={onClose}
                >
                  {item.name}
                </Link>
              ))}
            </section>
          ))}
        </div>

        <Link
          className={`g2-mega-promo tone-${category.accent}`}
          to={`/category/${category.slug}`}
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
  const { formatMoney, t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
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
    setMobileGroup(null);
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
    setActiveMega(slug);
  }

  return (
    <header className="market-shell-header g2-market-header">
      {promoVisible ? (
        <div className="g2-campaign-banner">
          <p>
            <b>Ysello</b>
            <strong>{t("campaignLabel")}</strong>
            <span>{t("campaignText")}</span>
          </p>
          <Link to="/catalog?sort=popular">{t("campaignCta")}</Link>
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
              placeholder={t("whatLooking")}
            />
            <label>
              <span className="sr-only">Search category</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                aria-label="Search category"
              >
                <option value="all">{t("allCategories")}</option>
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
                <small>
                  {user
                    ? `${t("availableBalance")}: ${formatMoney(user.balanceCents)}`
                    : t("signIn")}
                </small>
                <strong>{user ? t("account") : t("register")}</strong>
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
          {marketplaceTaxonomy.slice(0, 6).map((category) => (
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
            </button>
          ))}
          <Link className="g2-department-cta" to="/seller/apply">
            <Store aria-hidden="true" /> {t("startSelling")}
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
              <button
                className="g2-drawer-close"
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
              <Link className="market-wordmark" to="/">
                <img src="/ysello-mark.svg" alt="" width="42" height="42" />
                <span>
                  <strong>ysello</strong>
                </span>
              </Link>
              <div className="g2-drawer-actions">
                <LocaleSwitcher compact />
                <Link
                  to={accountPath}
                  aria-label={user ? "Account" : "Sign in"}
                >
                  <UserRound aria-hidden="true" />
                </Link>
                <Link
                  to={user ? "/dashboard" : "/sign-in"}
                  aria-label="Saved items"
                >
                  <Heart aria-hidden="true" />
                </Link>
                <Link to="/cart" aria-label={`Cart with ${count} items`}>
                  <ShoppingCart aria-hidden="true" />
                  {count ? <b>{count}</b> : null}
                </Link>
              </div>
            </header>

            <section className="g2-mobile-categories">
              <div className="g2-mobile-category-heading">
                <strong>
                  <span>{t("categories")}</span>
                </strong>
                <Link to="/catalog">{t("viewAll")}</Link>
              </div>
              {marketplaceTaxonomy.map((category) => {
                const expanded = mobileCategory === category.slug;
                return (
                  <div className="g2-mobile-category" key={category.slug}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => {
                        setMobileCategory(expanded ? null : category.slug);
                        setMobileGroup(null);
                      }}
                    >
                      <DepartmentIcon category={category} />
                      <span>{category.name}</span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {expanded ? (
                      <div className="g2-mobile-category-panel">
                        <Link
                          className="g2-mobile-view-all"
                          to={`/category/${category.slug}`}
                        >
                          {t("viewAll")}
                        </Link>
                        {category.subcategories.map((group) => {
                          const groupExpanded = mobileGroup === group.slug;
                          return (
                            <div className="g2-mobile-group" key={group.slug}>
                              {group.children?.length ? (
                                <>
                                  <button
                                    type="button"
                                    aria-expanded={groupExpanded}
                                    onClick={() =>
                                      setMobileGroup(
                                        groupExpanded ? null : group.slug,
                                      )
                                    }
                                  >
                                    <Grid2X2 aria-hidden="true" />
                                    <span>{group.name}</span>
                                    <ChevronDown aria-hidden="true" />
                                  </button>
                                  {groupExpanded ? (
                                    <div className="g2-mobile-leaves">
                                      <Link to={`/category/${group.slug}`}>
                                        All {group.name}
                                      </Link>
                                      {group.children.map((item) => (
                                        <Link
                                          key={item.slug}
                                          to={`/category/${item.slug}`}
                                        >
                                          {item.name}
                                        </Link>
                                      ))}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <Link to={`/category/${group.slug}`}>
                                  <Grid2X2 aria-hidden="true" />
                                  <span>{group.name}</span>
                                </Link>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <div className="g2-mobile-secondary-links">
              <Link to="/seller/apply">{t("startSelling")}</Link>
              <Link to="/buyer-protection">{t("protection")}</Link>
              <Link to="/support">{t("support")}</Link>
            </div>
            {user ? (
              <section className="g2-mobile-account-panel">
                <div>
                  <span>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                  <div>
                    <small>Signed in as</small>
                    <strong>
                      {user.firstName} {user.lastName}
                    </strong>
                    <em>{formatMoney(user.balanceCents)} available</em>
                  </div>
                </div>
                <div>
                  <Link to={accountPath}>
                    <UserRound aria-hidden="true" /> {t("dashboard")}
                  </Link>
                  <Link className="danger" to="/sign-out">
                    <LogOut aria-hidden="true" /> {t("signOut")}
                  </Link>
                </div>
              </section>
            ) : (
              <section className="g2-mobile-account-panel guest">
                <strong>Marketplace account</strong>
                <div>
                  <Link to="/sign-in">{t("signIn")}</Link>
                  <Link to="/register">{t("register")}</Link>
                </div>
              </section>
            )}
            <div className="market-mobile-locale">
              <strong>
                {t("language")} &amp; {t("currency")}
              </strong>
              <LocaleSwitcher />
            </div>
          </nav>
        </>
      ) : null}
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
          <strong>About</strong>
          <Link to="/about">Company</Link>
          <Link to="/catalog">{t("products")}</Link>
          <Link to="/buyer-protection">Marketplace security</Link>
          <Link to="/contact">Contact</Link>
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

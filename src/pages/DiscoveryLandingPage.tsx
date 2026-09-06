import { useMemo } from "react";
import { ArrowRight, Gamepad2, Gift, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { UiText } from "../i18n/UiText";
import { useMarketplaceCategories, useMarketplaceProductFeed } from "../commerce/useMarketplace";
import { categoryPath } from "../commerce/marketplaceUrls";
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import { useCart } from "../commerce/CartContext";
import { useNavigate } from "react-router-dom";

export type DiscoveryKind = "games" | "gift-cards" | "topups";

const config = {
  games: {
    title: "Games",
    eyebrow: "GAMES MARKETPLACE",
    intro: "Choose a game or gaming category, then compare the available products, top-ups, currencies and vouchers.",
    icon: Gamepad2,
    canonical: "/games",
    keywords: /game|gaming|steam|xbox|playstation|nintendo|pubg|free fire|roblox|valorant|fortnite|mobile legends|battle\.net|gog|ubisoft|epic/i,
  },
  "gift-cards": {
    title: "Gift Cards",
    eyebrow: "DIGITAL GIFT CARDS",
    intro: "Browse gift cards and vouchers by platform, storefront and service.",
    icon: Gift,
    canonical: "/gift-cards",
    keywords: /gift card|gift-card|voucher|wallet code|google play|apple gift|steam gift|playstation gift|xbox gift|nintendo gift/i,
  },
  topups: {
    title: "Top-Ups",
    eyebrow: "GAME & DIGITAL TOP-UPS",
    intro: "Choose a game or service and view the available credit, diamonds, coins, points and other top-up products.",
    icon: Zap,
    canonical: "/topups",
    keywords: /top.?up|diamonds|coins|points|robux|v-?bucks|digital credit|game currency|game credits/i,
  },
} as const;

function salesNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DiscoveryLandingPage({ kind }: { kind: DiscoveryKind }) {
  const cfg = config[kind];
  const Icon = cfg.icon;
  const categories = useMarketplaceCategories();
  const { products, loading } = useMarketplaceProductFeed();
  const { add } = useCart();
  const navigate = useNavigate();

  const matchingProducts = useMemo(
    () =>
      products
        .filter((product) =>
          cfg.keywords.test(
            `${product.category} ${product.categorySlug} ${product.title} ${product.description} ${(product.tags ?? []).join(" ")}`,
          ),
        )
        .sort((a, b) => salesNumber(b.sales) - salesNumber(a.sales))
        .slice(0, 60),
    [cfg.keywords, products],
  );

  const categorySlugs = new Set(matchingProducts.flatMap((product) => product.categoryPathSlugs ?? [product.categorySlug]));
  const matchingCategories = categories
    .filter(
      (category) =>
        (category.productCount ?? 0) > 0 &&
        (cfg.keywords.test(`${category.name} ${category.slug} ${category.description}`) || categorySlugs.has(category.slug)),
    )
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));

  return (
    <main className="ys-discovery-page">
      <Seo
        title={`Buy ${cfg.title} & Digital Products | Ysello`}
        description={cfg.intro}
        canonicalPath={cfg.canonical}
      />
      <MarketHeader />
      <div className="ys-home-container">
        <section className="ys-discovery-hero">
          <span className="ys-discovery-icon"><Icon /></span>
          <div>
            <span className="ys-eyebrow"><UiText value={cfg.eyebrow} /></span>
            <h1><UiText value={cfg.title} /></h1>
            <p><UiText value={cfg.intro} /></p>
          </div>
        </section>

        <section className="ys-company-section">
          <header className="ys-section-heading">
            <div>
              <span className="ys-eyebrow"><UiText value="CHOOSE A CATEGORY" /></span>
              <h2><UiText value={kind === "games" ? "Choose a game" : `Browse ${cfg.title}`} /></h2>
            </div>
            <Link to="/catalog"><UiText value="All products" /> <ArrowRight /></Link>
          </header>
          <div className="ys-discovery-category-grid">
            {matchingCategories.map((category) => (
              <Link key={category.slug} to={categoryPath(category, categories)}>
                <span><UiText value={category.name} /></span>
                <small>{category.productCount ?? 0} <UiText value="products" /></small>
                <ArrowRight />
              </Link>
            ))}
            {!matchingCategories.length && !loading ? (
              <div className="ys-discovery-empty"><UiText value="No matching categories are published yet." /></div>
            ) : null}
          </div>
        </section>

        <section className="ys-company-section">
          <header className="ys-section-heading">
            <div>
              <span className="ys-eyebrow"><UiText value="POPULAR PRODUCTS" /></span>
              <h2><UiText value={`Popular ${cfg.title}`} /></h2>
            </div>
          </header>
          <div className="ys-catalog-product-grid">
            {matchingProducts.map((product) => (
              <YselloReferenceProductCard
                key={product.id}
                product={product}
                onBuy={(item) => { add(item); navigate("/cart"); }}
              />
            ))}
          </div>
        </section>
      </div>
      <MarketFooter />
    </main>
  );
}

import { UiText } from "../i18n/UiText";
import { useSearchParams } from "react-router-dom";
import { CatalogPagination } from "../components/CatalogPagination";
import {
  BadgeCheck,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { SellerContactDialog } from "../components/SellerContactDialog";
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import { useMarketplaceStore } from "../commerce/useMarketplace";
import { NotFoundPage } from "./NotFoundPage";

export function StorePage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const live = useMarketplaceStore(slug);
  const store = live.store;
  if (live.loading && !store)
    return (
      <main className="commerce-page ys-store-page">
        <MarketHeader />
        <p className="empty-state">Loading store…</p>
      </main>
    );
  if (!store || !slug) return <NotFoundPage />;
  const products = live.products;
  const totalPages = Math.max(1, Math.ceil(products.length / 50));
  const page = Math.min(
    totalPages,
    Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
  );
  const bannerUrl =
    store.bannerUrl || (store.isOfficial ? "/ysello-official-banner.svg" : "");
  return (
    <main className="commerce-page ys-store-page">
      <Seo
        title={`${store.name} digital store`}
        description={store.about}
        canonicalPath={`/stores/${slug}`}
        image={store.bannerUrl || "/marketplace-assets/seller-growth.webp"}
        imageAlt={`${store.name} digital storefront`}
        schema={{
          "@context": "https://schema.org",
          "@type": "Store",
          name: store.name,
          description: store.about,
          url: `https://ysello.com/stores/${slug}`,
          image: `https://ysello.com/marketplace-assets/seller-growth.webp`,
        }}
      />
      <MarketHeader />
      <section
        className={`store-banner has-store-banner professional-store-hero ${store.bannerUrl ? "has-live-banner" : "no-live-banner"}`}
      >
        {bannerUrl ? (
          <img
            className="ys-store-banner-image"
            src={bannerUrl}
            alt={`${store.name} banner`}
            width="1600"
            height="400"
          />
        ) : null}
        <div className="ys-store-profile-row">
          <div className="store-monogram store-logo">
            {store.logoUrl || store.isOfficial ? (
              <img
                src={store.logoUrl || "/ysello-mark.svg"}
                alt={`${store.name} logo`}
              />
            ) : (
              store.mark
            )}
          </div>
          <div>
            <span className="verified-store">
              <BadgeCheck /> {store.isOfficial ? "OFFICIAL" : "VERIFIED SELLER"}
            </span>
            <h1>
              <UiText value={store.name} />
            </h1>
            <p>{store.about}</p>
            <div className="store-facts">
              <span>
                <Star fill="currentColor" /> {store.rating.toFixed(1)} rating
              </span>
              <span>{store.sales} sales</span>
              <span>{products.length} products</span>
              <span>
                <CalendarDays /> Joined {store.joined}
              </span>
            </div>
          </div>
          <SellerContactDialog storeSlug={slug} storeName={store.name} />
        </div>
      </section>
      <section className="store-body">
        <div>
          <div className="store-products-heading">
            <div>
              <span className="section-index">ALL PRODUCTS</span>
              <h2>
                <UiText value={store.name} /> catalog
              </h2>
            </div>
            <span>{products.length} live listings</span>
          </div>
          {products.length ? (
            <div className="store-products store-products-premium store-product-icon-grid store-live-product-grid">
              {products.slice((page - 1) * 50, page * 50).map((product) => (
                <YselloReferenceProductCard
                  key={product.id}
                  product={product}
                  onBuy={(selected) => {
                    add(selected);
                    navigate("/cart");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              This store has no live products right now.
            </div>
          )}
          <CatalogPagination
            page={page}
            totalPages={totalPages}
            total={products.length}
            onPage={(next) => {
              const updated = new URLSearchParams(params);
              updated.set("page", String(next));
              setParams(updated);
              document
                .querySelector(".store-products-heading")
                ?.scrollIntoView({ block: "start" });
            }}
          />
        </div>
        <aside>
          <ShieldCheck />
          <h2>
            <UiText value="Seller policy" />
          </h2>
          <p>{store.policy}</p>
          <small>
            All purchases remain covered by Ysello buyer protection and the
            platform refund policy.
          </small>
        </aside>
      </section>
      <MarketFooter />
    </main>
  );
}

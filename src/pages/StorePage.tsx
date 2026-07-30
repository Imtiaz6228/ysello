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
import { YselloReferenceProductCard } from "../components/YselloReferenceLayout";
import { useMarketplaceStore } from "../commerce/useMarketplace";
import { NotFoundPage } from "./NotFoundPage";

export function StorePage() {
  const { slug } = useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const live = useMarketplaceStore(slug);
  const store = live.store;
  if (live.loading && !store)
    return (
      <main className="commerce-page">
        <MarketHeader />
        <p className="empty-state">Loading store…</p>
      </main>
    );
  if (!store || !slug) return <NotFoundPage />;
  const products = live.products;
  return (
    <main className="commerce-page">
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
        className="store-banner has-store-banner"
        style={{
          backgroundImage: `linear-gradient(100deg, rgba(8,12,26,.96), rgba(31,38,102,.72)), url(${store.bannerUrl || "/marketplace-assets/seller-growth.webp"})`,
        }}
      >
        <div className="store-monogram store-logo">
          {store.logoUrl ? (
            <img src={store.logoUrl} alt={`${store.name} logo`} />
          ) : (
            store.mark
          )}
        </div>
        <div>
          <span className="verified-store">
            <BadgeCheck /> {store.isOfficial ? "YSELLO OFFICIAL" : "VERIFIED SELLER"}
          </span>
          <h1>{store.name}</h1>
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
        <Link to="/support">
          <MessageCircle /> Contact seller
        </Link>
      </section>
      <section className="store-body">
        <div>
          <div className="store-products-heading">
            <div>
              <span className="section-index">ALL PRODUCTS</span>
              <h2>{store.name} catalog</h2>
            </div>
            <span>{products.length} live listings</span>
          </div>
          {products.length ? (
            <div className="store-products store-products-premium store-product-icon-grid">
              {products.map((product) => (
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
        </div>
        <aside>
          <ShieldCheck />
          <h2>Seller policy</h2>
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

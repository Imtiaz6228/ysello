import {
  BadgeCheck,
  CalendarDays,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../commerce/CartContext";
import { productPath } from "../commerce/marketplaceUrls";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useMarketplaceStore } from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";
import { NotFoundPage } from "./NotFoundPage";

export function StorePage() {
  const { formatProductMoney } = useLocale();
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
        image="/marketplace-assets/seller-growth.webp"
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
          backgroundImage:
            "linear-gradient(100deg, rgba(8,12,26,.96), rgba(31,38,102,.72)), url(/marketplace-assets/seller-growth.webp)",
        }}
      >
        <div className="store-monogram">{store.mark}</div>
        <div>
          <span className="verified-store">
            <BadgeCheck /> VERIFIED SELLER
          </span>
          <h1>{store.name}</h1>
          <p>{store.about}</p>
          <div className="store-facts">
            <span>
              <Star fill="currentColor" /> {store.rating} rating
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
          <span className="section-index">PRODUCTS</span>
          <div className="store-products">
            {products.map((product) => (
              <article key={product.id}>
                <div className="store-product-icon" aria-hidden="true">
                  <PackageCheck />
                </div>
                <Link to={productPath(product)}>
                  <h2>{product.title}</h2>
                </Link>
                <p>{product.description}</p>
                <footer>
                  <strong>{formatProductMoney(product)}</strong>
                  <button
                    onClick={() => {
                      add(product);
                      navigate("/cart");
                    }}
                  >
                    <ShoppingBag /> Add to cart
                  </button>
                </footer>
              </article>
            ))}
          </div>
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

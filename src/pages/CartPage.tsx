import { useEffect, useState } from "react";
import {
  ArrowRight,
  ImageIcon,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { mediaUrl } from "../api/client";
import { useCart } from "../commerce/CartContext";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { useLocale } from "../i18n/LocaleContext";

function CartProductImage({
  src,
  alt,
  icon,
}: {
  src?: string | null;
  alt: string;
  icon: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={mediaUrl(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      width="160"
      height="120"
      onError={() => setFailed(true)}
    />
  ) : (
    <span aria-label={`${alt} image unavailable`}>{icon || <ImageIcon />}</span>
  );
}

export function CartPage() {
  const { formatMoney, formatProductMoney, t } = useLocale();
  const { items, subtotalCents, remove, setQuantity } = useCart();
  return (
    <main className="commerce-page">
      <Seo
        title="Your cart"
        description="Review your Ysello digital products and continue to checkout."
        noIndex
      />
      <MarketHeader />
      <section className="simple-hero">
        <span className="section-index">YOUR CART</span>
        <h1>Ready when you are.</h1>
        <p>Review products, delivery types, and quantities before checkout.</p>
      </section>
      {items.length === 0 ? (
        <section className="empty-cart">
          <ShoppingBag />
          <h2>Your cart is quiet.</h2>
          <p>
            Original digital goods and expert services are waiting in the
            catalog.
          </p>
          <Link className="primary-link" to="/catalog">
            {t("shopMarketplace")} <ArrowRight />
          </Link>
        </section>
      ) : (
        <section className="cart-layout">
          <div className="cart-items">
            {items.map(({ product, quantity }) => (
              <article key={product.id}>
                <div className="cart-thumb">
                  <CartProductImage
                    src={product.imageUrl}
                    alt={product.title}
                    icon={product.icon}
                  />
                </div>
                <div>
                  <span>{product.category}</span>
                  <Link to={`/product/${product.slug}`}>{product.title}</Link>
                  <small>
                    {product.delivery} · {product.seller}
                  </small>
                </div>
                <div className="quantity-control">
                  <button
                    aria-label={`Decrease ${product.title} quantity`}
                    onClick={() => setQuantity(product.id, quantity - 1)}
                  >
                    <Minus />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    aria-label={`Increase ${product.title} quantity`}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                  >
                    <Plus />
                  </button>
                </div>
                <strong>{formatProductMoney(product, quantity)}</strong>
                <button
                  className="icon-button"
                  onClick={() => remove(product.id)}
                  aria-label={`Remove ${product.title}`}
                >
                  <Trash2 />
                </button>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <span className="section-index">ORDER SUMMARY</span>
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotalCents)}</strong>
            </div>
            <div>
              <span>Delivery</span>
              <strong>Digital · {formatMoney(0)}</strong>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatMoney(subtotalCents)}</strong>
            </div>
            <Link className="checkout-button" to="/checkout">
              {t("secureCheckout")} <ArrowRight />
            </Link>
            <p>
              <ShieldCheck /> Payments stay protected. Downloads release only
              after confirmation.
            </p>
          </aside>
        </section>
      )}
      <MarketFooter />
    </main>
  );
}

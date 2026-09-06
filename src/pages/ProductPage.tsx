import { UiText } from "../i18n/UiText";
import { ProductArtwork } from "../components/ProductArtwork";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock3,
  Download,
  FileArchive,
  Flag,
  Globe2,
  Layers3,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";
import { productCategoryPath, productPath } from "../commerce/marketplaceUrls";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { SellerContactDialog } from "../components/SellerContactDialog";
import {
  useMarketplaceProduct,
  useMarketplaceProducts,
} from "../commerce/useMarketplace";
import { useLocale } from "../i18n/LocaleContext";
import { MarketplaceProductCard } from "../components/MarketplaceProductCard";
import { detectMarketplaceBrandSlug } from "../components/MarketplaceBrandIcon";
import type { CatalogProduct } from "../data/catalog";
import { NotFoundPage } from "./NotFoundPage";

export function ProductPage() {
  const { formatProductMoney, currency, t } = useLocale();
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [artMode, setArtMode] = useState<"cover" | "contents" | "license">(
    "cover",
  );
  const [quantity, setQuantity] = useState(1);
  const { product, loading } = useMarketplaceProduct(slug);
  const marketplaceProducts = useMarketplaceProducts();
  const relatedProducts = useMemo(
    () =>
      marketplaceProducts
        .filter(
          (item) =>
            item.id !== product?.id &&
            item.categorySlug === product?.categorySlug,
        )
        .slice(0, 4),
    [marketplaceProducts, product],
  );
  const schema = useMemo(() => {
    if (!product) return undefined;
    const localizedOffer =
      currency === "CNY" && (product.priceCnyCents ?? 0) > 0
        ? { cents: product.priceCnyCents!, code: "CNY" }
        : currency === "RUB" && (product.priceRubCents ?? 0) > 0
          ? { cents: product.priceRubCents!, code: "RUB" }
          : { cents: product.priceCents, code: "USD" };

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description,
      url: `https://ysello.com${productPath(product)}`,
      sku: product.sku || product.id,
      category: product.category,
      ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
      offers: {
        "@type": "Offer",
        url: `https://ysello.com${productPath(product)}`,
        price: (localizedOffer.cents / 100).toFixed(2),
        priceCurrency: localizedOffer.code,
        availability:
          product.type === "SERVICE" || (product.stockCount ?? 0) > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: product.seller,
          url: `https://ysello.com/stores/${product.sellerSlug}`,
        },
      },
      ...(product.reviews > 0 && product.rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.rating,
              reviewCount: product.reviews,
            },
          }
        : {}),
    };
  }, [currency, product]);

  if (loading)
    return (
      <main className="commerce-page">
        <MarketHeader />
        <p className="empty-state">Loading product…</p>
      </main>
    );
  if (!product) return <NotFoundPage />;

  function addToCart() {
    add(product!, effectiveQuantity);
    setAdded(true);
    navigate("/cart");
  }

  function addRelatedToCart(item: CatalogProduct) {
    add(item);
    navigate("/cart");
  }

  const included =
    product.included ??
    (product.type === "DOWNLOAD"
      ? [
          "Primary digital product files",
          "Setup and usage guide",
          "Future file corrections",
        ]
      : [
          "Seller-delivered project scope",
          "Written delivery summary",
          "Order-linked revision window",
        ]);
  const formats =
    product.formats ??
    (product.type === "DOWNLOAD"
      ? ["Digital files", "PDF guide"]
      : ["Protected order delivery"]);
  const minimumQuantity = Math.max(1, product.minimumOrder ?? 1);
  const maximumQuantity = Math.max(
    minimumQuantity,
    Math.min(
      product.maximumOrder ?? 20,
      product.type === "SERVICE" ? 20 : (product.stockCount ?? 0),
    ),
  );
  const effectiveQuantity = Math.min(
    maximumQuantity,
    Math.max(minimumQuantity, quantity),
  );
  const available = product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
  const supplierFulfilled = product.attributes?.supplierFulfilled === true;
  const brandSlug = detectMarketplaceBrandSlug(
    typeof product.facts?.platform === "string" ? product.facts.platform : "",
    product.category,
    product.title,
  );
  const requirementFacts = Object.entries(product.facts ?? {}).slice(0, 4);

  return (
    <main className="commerce-page">
      <Seo
        title={`${t("buyOnline")} — ${product.title}`}
        description={`${product.description} ${t("productSeoSuffix")}`}
        canonicalPath={productPath(product)}
        image={product.imageUrl ?? undefined}
        imageAlt={product.title}
        type="product"
        schema={
          schema
            ? [
                schema,
                {
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      name: "Marketplace",
                      item: "https://ysello.com/catalog",
                    },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: product.category,
                      item: `https://ysello.com${productCategoryPath(product)}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: product.title,
                      item: `https://ysello.com${productPath(product)}`,
                    },
                  ],
                },
              ]
            : undefined
        }
      />
      <MarketHeader />
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={productCategoryPath(product)}>{product.category}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.title}</span>
      </div>
      <section className="product-detail">
        <div className="product-gallery">
          <div className={`product-detail-art product-art-${artMode}`}>
            {artMode === "cover" ? (
              brandSlug ? (
                <div className="ys-detail-platform-art">
                  <ProductArtwork product={product} />
                </div>
              ) : product.imageUrl ? (
                <div className="product-detail-cover">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    loading="eager"
                    decoding="async"
                    width="1200"
                    height="900"
                  />
                  <div>
                    <small>{product.category}</small>
                    <strong>{product.title}</strong>
                    <span>
                      {product.type === "SERVICE"
                        ? "Seller-delivered service"
                        : "Protected digital delivery"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="product-art-information product-icon-preview">
                  <PackageCheck />
                  <small>{product.category}</small>
                  <strong>{product.title}</strong>
                  <span>
                    {product.type === "SERVICE"
                      ? "Seller-delivered service"
                      : "Protected digital delivery"}
                  </span>
                </div>
              )
            ) : artMode === "contents" ? (
              <div className="product-art-information">
                <PackageCheck />
                <small>WHAT IS INCLUDED</small>
                <strong>{included.length} ready-to-use deliverables</strong>
                <span>{included.join(" · ")}</span>
              </div>
            ) : (
              <div className="product-art-information">
                <ShieldCheck />
                <small>LICENSE & SUPPORT</small>
                <strong>
                  {product.license ?? "Standard marketplace license"}
                </strong>
                <span>
                  {product.afterSalesServiceHours ?? 24}-hour after-sales
                  support window
                </span>
              </div>
            )}
            <small>ORIGINAL DIGITAL WORK</small>
          </div>
          <div
            className="product-gallery-thumbs"
            role="group"
            aria-label="Product information views"
          >
            <button
              type="button"
              className={artMode === "cover" ? "active" : ""}
              aria-pressed={artMode === "cover"}
              onClick={() => setArtMode("cover")}
            >
              <PackageCheck />
              <small>Preview</small>
            </button>
            <button
              type="button"
              className={artMode === "contents" ? "active" : ""}
              aria-pressed={artMode === "contents"}
              onClick={() => setArtMode("contents")}
            >
              <PackageCheck />
              <small>Included</small>
            </button>
            <button
              type="button"
              className={artMode === "license" ? "active" : ""}
              aria-pressed={artMode === "license"}
              onClick={() => setArtMode("license")}
            >
              <ShieldCheck />
              <small>License</small>
            </button>
          </div>
        </div>
        <div className="product-detail-copy">
          <span className="section-index">{product.category}</span>
          <h1>
            <UiText value={product.title} />
          </h1>
          <div className="detail-rating">
            <Star fill="currentColor" /> <strong>{product.rating}</strong>
            <span>{product.reviews} verified reviews</span>
            <span>·</span>
            <span>{product.sales} sales</span>
          </div>
          <p>{product.longDescription}</p>
          <Link
            className="seller-identity"
            to={`/stores/${product.sellerSlug}`}
          >
            <span>{product.seller.slice(0, 2).toUpperCase()}</span>
            <div>
              <small>SOLD BY</small>
              <strong>
                {product.seller} <BadgeCheck />
              </strong>
            </div>
          </Link>
          {product.sellerSlug ? (
            <SellerContactDialog
              storeSlug={product.sellerSlug}
              storeName={product.seller}
              productSlug={product.slug}
              productTitle={product.title}
              className="product-seller-contact"
            />
          ) : null}
          <div className="detail-highlights">
            <span>
              <Clock3 /> {product.delivery}
            </span>
            <span>
              <RefreshCw /> Order-linked delivery record
            </span>
            <span>
              <ShieldCheck /> <UiText value="Buyer protection" />
            </span>
            <span>
              <RefreshCw /> {product.afterSalesServiceHours ?? 12}h after-sales
              dispute window
            </span>
            {product.type === "DOWNLOAD" ? (
              <span>
                <Download /> Protected download access
              </span>
            ) : (
              <span>
                <MessageCircle /> Protected delivery chat
              </span>
            )}
          </div>
          <div className="product-format-row">
            {formats.map((format) => (
              <span key={format}>{format}</span>
            ))}
          </div>
        </div>
        <aside className="buy-panel">
          <span>One-time purchase</span>
          <strong>{formatProductMoney(product)}</strong>
          <small>{currency} display · charged from the USD base price</small>
          <div
            className={`product-availability ${available ? "available" : "unavailable"}`}
          >
            <i />
            {available
              ? product.type === "SERVICE"
                ? "Available to order"
                : `${product.stockCount} delivery ${product.stockCount === 1 ? "unit" : "units"} available`
              : "Currently unavailable"}
          </div>
          {available && (maximumQuantity > 1 || minimumQuantity > 1) ? (
            <div className="product-quantity">
              <span>
                <strong>Quantity</strong>
                <small>
                  {minimumQuantity > 1
                    ? `Minimum ${minimumQuantity}`
                    : `Maximum ${maximumQuantity}`}
                </small>
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={effectiveQuantity <= minimumQuantity}
                  onClick={() => setQuantity(effectiveQuantity - 1)}
                >
                  <Minus />
                </button>
                <input
                  aria-label="Quantity"
                  type="number"
                  min={minimumQuantity}
                  max={maximumQuantity}
                  value={effectiveQuantity}
                  onChange={(event) =>
                    setQuantity(Number(event.target.value) || minimumQuantity)
                  }
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={effectiveQuantity >= maximumQuantity}
                  onClick={() => setQuantity(effectiveQuantity + 1)}
                >
                  <Plus />
                </button>
              </div>
            </div>
          ) : null}
          <button type="button" onClick={addToCart} disabled={!available}>
            {added ? <Check /> : <ShoppingBag />}
            {available
              ? added
                ? t("cart")
                : t("addToCart")
              : t("unavailable")}
          </button>
          <Link to="/cart">View cart</Link>
          <ul>
            <li>
              <Check /> Secure payment confirmation
            </li>
            <li>
              <Check /> Invoice included
            </li>
            <li>
              <Check /> Support if anything goes wrong
            </li>
          </ul>
        </aside>
      </section>

      <section className="product-market-brief">
        <header>
          <span className="section-index">PURCHASE BRIEF</span>
          <h2>
            <UiText value="Know the handoff before checkout." />
          </h2>
          <p>
            Everything important is summarized here so the order starts with
            shared expectations.
          </p>
        </header>
        <div className="product-journey">
          <article>
            <b>01</b>
            <span>
              <strong>Review the listing</strong>
              <small>
                Confirm scope, format, license, and any product-specific
                requirements.
              </small>
            </span>
          </article>
          <article>
            <b>02</b>
            <span>
              <strong>Place the order</strong>
              <small>
                Payment confirmation and your invoice remain attached to the
                order record.
              </small>
            </span>
          </article>
          <article>
            <b>03</b>
            <span>
              <strong>Receive delivery</strong>
              <small>
                {product.delivery}. Downloads or seller delivery remain
                available from your buyer workspace.
              </small>
            </span>
          </article>
          <article>
            <b>04</b>
            <span>
              <strong>Get contextual support</strong>
              <small>
                Message the seller or open a case within the{" "}
                {product.afterSalesServiceHours ?? 12}-hour after-sales window.
              </small>
            </span>
          </article>
        </div>
        <aside>
          <ShieldCheck />
          <div>
            <small>BEFORE YOU CONTINUE</small>
            <strong>
              {requirementFacts.length
                ? "Confirm these listing details"
                : "This listing has no extra prerequisites"}
            </strong>
            {requirementFacts.length ? (
              <ul>
                {requirementFacts.map(([label, value]) => (
                  <li key={label}>
                    <span>{label.replace(/([A-Z])/g, " $1")}</span>
                    <b>{String(value)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Review the included files and license above, then continue when
                the product fits your intended use.
              </p>
            )}
          </div>
        </aside>
      </section>

      <section className="product-information-grid">
        <article className="product-included-card">
          <span className="section-index">PACKAGE CONTENTS</span>
          <h2>
            <UiText value="Everything included in your order." />
          </h2>
          <div>
            {included.map((item) => (
              <p key={item}>
                <Check /> {item}
              </p>
            ))}
          </div>
        </article>
        <article className="product-facts-card">
          <span className="section-index">PRODUCT FACTS</span>
          <dl>
            <div>
              <dt>
                <ShieldCheck /> License
              </dt>
              <dd>{product.license ?? "Standard marketplace license"}</dd>
            </div>
            <div>
              <dt>
                <FileArchive /> Formats
              </dt>
              <dd>{formats.join(", ")}</dd>
            </div>
            <div>
              <dt>
                <Layers3 /> Version
              </dt>
              <dd>{product.version ?? "Current release"}</dd>
            </div>
            <div>
              <dt>
                <RefreshCw /> Last updated
              </dt>
              <dd>{product.updatedAt ?? "Maintained by seller"}</dd>
            </div>
            <div>
              <dt>
                <Globe2 /> Delivery
              </dt>
              <dd>{product.delivery}</dd>
            </div>
            <div>
              <dt>
                <MessageCircle /> Seller response
              </dt>
              <dd>Within {product.afterSalesServiceHours ?? 24} hours</dd>
            </div>
            {Object.entries(product.facts ?? {}).map(([label, value]) => (
              <div key={label}>
                <dt>
                  <Check /> {label.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
            {product.sku ? (
              <div>
                <dt>
                  <Layers3 /> SKU
                </dt>
                <dd>{product.sku}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      </section>

      {product.warranty || product.refundPolicy ? (
        <section className="product-policy-strip">
          <div>
            <ShieldCheck />
            <span>
              <strong>Warranty</strong>
              <small>
                {product.warranty ?? "Seller warranty terms apply."}
              </small>
            </span>
          </div>
          <div>
            <RefreshCw />
            <span>
              <strong>
                <UiText value="Refund policy" />
              </strong>
              <small>
                {product.refundPolicy ?? "Marketplace refund policy applies."}
              </small>
            </span>
          </div>
        </section>
      ) : null}

      <section className="product-policy-strip">
        <div>
          <ShieldCheck />
          <span>
            <strong>Review before buying</strong>
            <small>
              Confirm the file formats, license scope, and requirements above.
            </small>
          </span>
        </div>
        <div>
          <Download />
          <span>
            <strong>Protected delivery</strong>
            <small>
              Downloads and seller submissions stay linked to your order.
            </small>
          </span>
        </div>
        <div>
          <MessageCircle />
          <span>
            <strong>Contextual support</strong>
            <small>
              Open a support request directly from the relevant order.
            </small>
          </span>
        </div>
      </section>

      <section className="detail-section review-showcase">
        <div>
          <span className="section-index">VERIFIED REVIEWS</span>
          <h2>
            <UiText value="Buyers know what arrived." />
          </h2>
          <p>
            Only customers with a paid order can publish a review. Sellers can
            respond, and abusive content enters moderation.
          </p>
        </div>
        <div className="review-cards">
          {product.verifiedReviews?.length ? (
            product.verifiedReviews.map((review) => (
              <article key={review.id}>
                <span>{review.rating.toFixed(1)} / 5</span>
                <p>“{review.body}”</p>
                <small>
                  <BadgeCheck aria-hidden="true" /> {review.buyerName} ·
                  Verified purchase ·{" "}
                  {new Intl.DateTimeFormat("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(review.createdAt))}
                </small>
              </article>
            ))
          ) : (
            <article>
              <span>NEW</span>
              <p>
                This listing has no verified buyer reviews yet. Only customers
                with an eligible completed order can publish one.
              </p>
              <small>Be the first verified buyer to review</small>
            </article>
          )}
        </div>
      </section>

      <section className="product-faq-section">
        <div>
          <span className="section-index">BEFORE YOU BUY</span>
          <h2>
            <UiText value="Common questions" />
          </h2>
          <p>
            Important delivery and usage details, kept close to the purchase
            decision.
          </p>
        </div>
        <div>
          <details open>
            <summary>When will I receive this product?</summary>
            <p>
              {product.delivery}. Your order page shows the exact delivery state
              and any seller message.
            </p>
          </details>
          <details>
            <summary>Can I use it for client or commercial work?</summary>
            <p>
              {product.license ?? "The standard marketplace license applies"}.
              Review any seller-specific restrictions shown in the delivered
              license file.
            </p>
          </details>
          <details>
            <summary>What happens if something is missing?</summary>
            <p>
              Use the order-linked support flow within the{" "}
              {product.afterSalesServiceHours ?? 24}-hour after-sales window so
              the seller and support team have the correct context.
            </p>
          </details>
        </div>
      </section>

      {relatedProducts.length ? (
        <section className="related-product-section">
          <div className="catalog-section-heading">
            <div>
              <span className="section-index">CONTINUE EXPLORING</span>
              <h2>
                <UiText value="Related products" />
              </h2>
              <p>More products with a similar category or delivery format.</p>
            </div>
            <Link to={productCategoryPath(product)}>
              View category <ArrowLink />
            </Link>
          </div>
          <div className="related-product-grid">
            {relatedProducts.map((item) => (
              <MarketplaceProductCard
                key={item.id}
                product={item}
                onBuy={addRelatedToCart}
                layout="grid"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="report-line">
        <Flag />
        <div>
          <strong>Something doesn’t look right?</strong>
          <span>
            Account trading, stolen work, credentials, hacking tools, spam, and
            fake-review services are prohibited.
          </span>
        </div>
        <Link to={user ? "/support" : "/sign-in"}>Report product</Link>
      </section>
      <div className="product-mobile-purchase">
        <span>
          <small>{available ? product.delivery : t("unavailable")}</small>
          <strong>{formatProductMoney(product)}</strong>
        </span>
        <button type="button" disabled={!available} onClick={addToCart}>
          <ShoppingBag /> {available ? t("purchase") : t("unavailable")}
        </button>
      </div>
      <MarketFooter />
    </main>
  );
}

function ArrowLink() {
  return <span aria-hidden="true">→</span>;
}

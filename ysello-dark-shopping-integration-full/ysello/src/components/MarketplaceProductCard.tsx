import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Eye,
  PackageCheck,
  PackageOpen,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CatalogProduct } from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";
import {
  productCategoryPath,
  productPath,
} from "../commerce/marketplaceUrls";

type Props = {
  product: CatalogProduct;
  onBuy: (product: CatalogProduct) => void;
  layout?: "grid" | "list";
};

export function MarketplaceProductCard({
  product,
  onBuy,
  layout = "grid",
}: Props) {
  const { formatProductMoney, t } = useLocale();
  const stockLabel =
    product.type === "SERVICE"
      ? "Service slot"
      : (product.stockCount ?? 0) > 0
        ? `${product.stockCount ?? 0} available`
        : "Sold out";
  const canPurchase =
    product.type === "SERVICE" || (product.stockCount ?? 0) > 0;
  const ProductIcon =
    product.type === "SERVICE" ? BriefcaseBusiness : PackageOpen;
  const categoryParts = product.category.split(" / ");
  const categoryLabel =
    categoryParts[categoryParts.length - 1] ?? product.category;

  return (
    <article
      className={`market-product-card ys-product-card ${layout === "list" ? "list" : ""}`}
    >
      <div className="ys-product-card-top">
        {!canPurchase ? <span className="product-sold-out-ribbon">SOLD OUT</span> : null}
        <Link
          className="ys-product-glyph"
          to={productPath(product)}
          aria-label={`View ${product.title}`}
        >
          {product.imageUrl ? (
            <span
              className="ys-product-image"
              role="img"
              aria-label={product.title}
              style={{ backgroundImage: `url(${product.imageUrl})` }}
            />
          ) : (
            <ProductIcon aria-hidden="true" />
          )}
        </Link>
        <div className="ys-product-badges">
          <span className="ys-product-kind">
            {product.type === "SERVICE" ? "Service" : "Digital product"}
          </span>
        </div>
      </div>
      <div className="market-product-body">
        <div className="market-product-title-row">
          <div>
            <Link
              className="market-product-category"
              to={productCategoryPath(product)}
            >
              {categoryLabel}
            </Link>
            <Link to={productPath(product)}>
              <h2>{product.title}</h2>
            </Link>
            <Link
              className="market-product-seller"
              to={`/stores/${product.sellerSlug}`}
            >
              {product.seller} <BadgeCheck aria-hidden="true" />
            </Link>
          </div>
        </div>
        <p>{product.description}</p>
        <div className="market-product-meta">
          <span>
            <Clock3 /> {product.afterSalesServiceHours ?? 12} hours
          </span>
          <span>
            <PackageCheck /> {stockLabel}
          </span>
          <span>
            <Star fill="currentColor" />{" "}
            {product.rating > 0 ? product.rating : "No rating"}{" "}
            <small>({product.reviews})</small>
          </span>
          <span>
            <BarChart3 /> {product.sales || "0"} sales
          </span>
          <span>
            <Zap /> Auto
          </span>
        </div>
        <footer>
          <div>
            <strong>{formatProductMoney(product)}</strong>
            <small>Secure marketplace checkout</small>
          </div>
          <div className="market-card-actions">
            <Link to={productPath(product)}>
              <Eye /> {t("details")}
            </Link>
            <button
              type="button"
              disabled={!canPurchase}
              onClick={() => onBuy(product)}
            >
              <ShoppingCart /> {canPurchase ? t("purchase") : "Sold out"}
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

import { useEffect, useState } from "react";
import type { CatalogCategory } from "../data/catalog";
import {
  MarketplaceBrandArtwork,
  MarketplaceCategoryIcon,
  detectMarketplaceBrandSlug,
} from "./MarketplaceBrandIcon";

export function CategoryArtwork({
  category,
  compact = true,
  className = "",
}: {
  category: CatalogCategory;
  compact?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [category.imageUrl]);

  if (category.imageUrl && !failed) {
    return (
      <span className={`ys-category-artwork has-image ${className}`.trim()}>
        <img
          src={category.imageUrl}
          alt=""
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  const brandSlug = detectMarketplaceBrandSlug(category.name, category.slug);
  if (brandSlug) {
    return (
      <MarketplaceBrandArtwork
        brandSlug={brandSlug}
        compact={compact}
        className={`ys-category-artwork ${className}`.trim()}
      />
    );
  }

  return (
    <span className={`ys-category-artwork is-generic ${className}`.trim()}>
      <MarketplaceCategoryIcon slug={category.parentSlug || category.slug} />
    </span>
  );
}

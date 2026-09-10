import React, { useEffect, useState } from "react";
import type { CatalogProduct } from "../data/catalog";
import {
  MarketplaceBrandArtwork,
  detectMarketplaceBrandSlug,
} from "./MarketplaceBrandIcon";

export function ProductArtwork({ product }: { product: CatalogProduct }) {
  const brandSlug = detectMarketplaceBrandSlug(
    typeof product.facts?.platform === "string" ? product.facts.platform : "",
    product.category,
    product.title,
  );
  const source = product.imageUrl || "/ysello-mark.svg";
  const genericGameArtwork = new Set([
    "pubg-mobile",
    "free-fire",
    "genshin-impact",
    "honkai-star-rail",
    "wuthering-waves",
    "zenless-zone-zero",
    "mobile-legends",
    "valorant",
    "fortnite",
    "roblox",
  ]);
  const [failedSource, setFailedSource] = useState("");
  useEffect(() => setFailedSource(""), [source]);

  if (brandSlug && !(product.imageUrl && genericGameArtwork.has(brandSlug))) {
    return (
      <span className="ys-reliable-artwork is-platform">
        <MarketplaceBrandArtwork brandSlug={brandSlug} />
      </span>
    );
  }

  return (
    <span className="ys-reliable-artwork">
      <img
        src={source === failedSource ? "/ysello-mark.svg" : source}
        alt={product.title}
        width="160"
        height="160"
        loading="lazy"
        decoding="async"
        onError={() => setFailedSource(source)}
      />
    </span>
  );
}

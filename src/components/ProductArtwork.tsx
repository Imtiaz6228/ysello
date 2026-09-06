import React, { useState } from "react";
import type { CatalogProduct } from "../data/catalog";
import {
  identifyProductPlatform,
  platformImage,
} from "../data/platformIdentity";
export function ProductArtwork({ product }: { product: CatalogProduct }) {
  const identity = identifyProductPlatform(
    product.title,
    product.facts?.platform,
    product.category,
  );
  const source = identity
    ? platformImage(identity)
    : product.imageUrl || "/ysello-mark.svg";
  const [failedSource, setFailedSource] = useState("");
  return (
    <span className={`ys-reliable-artwork ${identity ? "is-platform" : ""}`}>
      <img
        src={source === failedSource ? "/ysello-mark.svg" : source}
        alt={identity ? `${identity.name} logo` : product.title}
        width="160"
        height="160"
        loading="lazy"
        decoding="async"
        onError={() => setFailedSource(source)}
      />
      {identity ? <span>{identity.name}</span> : null}
    </span>
  );
}

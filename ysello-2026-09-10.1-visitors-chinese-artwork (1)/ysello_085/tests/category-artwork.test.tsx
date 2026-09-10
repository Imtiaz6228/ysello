import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryArtwork } from "../src/components/CategoryArtwork.tsx";
import { MarketplaceCategoryIcon, MarketplacePlatformIcon, detectMarketplaceBrandSlug } from "../src/components/MarketplaceBrandIcon.tsx";
test("known category platform overrides an old generic remote image", () => {
  const html = renderToStaticMarkup(<CategoryArtwork category={{ name: "Facebook", slug: "facebook-accounts", imageUrl: "https://example.com/hashtag.svg" } as any} />);
  assert.match(html, /brand-facebook/);
  assert.doesNotMatch(html, /hashtag.svg/);
});
test("X and nested platform categories resolve their actual brands", () => {
  assert.equal(detectMarketplaceBrandSlug("x-accounts"), "x");
  const html = renderToStaticMarkup(<CategoryArtwork category={{ name: "新号", slug: "fresh", parentSlug: "instagram-accounts" } as any} />);
  assert.match(html, /brand-instagram/);
});
test("unknown categories and platforms have a visible non-hashtag fallback", () => {
  assert.match(renderToStaticMarkup(<MarketplaceCategoryIcon slug="unknown" />), /<svg/);
  assert.match(renderToStaticMarkup(<MarketplacePlatformIcon slug="unknown" />), /<svg/);
});

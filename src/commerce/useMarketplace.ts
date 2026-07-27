import { useEffect, useMemo, useState } from "react";
import { apiRequest, mediaUrl } from "../api/client";
import {
  catalogCategories,
  type CatalogCategory,
  type CatalogProduct,
} from "../data/catalog";
import { useLocale } from "../i18n/LocaleContext";
import { marketplaceTaxonomy } from "../data/marketplaceTaxonomy";

const taxonomyCategories: CatalogCategory[] = marketplaceTaxonomy.flatMap(
  (category, categoryIndex) => [
    {
      id: `taxonomy-${category.slug}`,
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: (categoryIndex + 1) * 100,
      productCount: 0,
      isFeatured: true,
    },
    ...category.subcategories.map((subcategory, subcategoryIndex) => ({
      id: `taxonomy-${subcategory.slug}`,
      slug: subcategory.slug,
      parentSlug: category.slug,
      name: subcategory.name,
      description: subcategory.description,
      icon: category.icon,
      sortOrder: (categoryIndex + 1) * 100 + subcategoryIndex + 1,
      productCount: 0,
    })),
  ],
);

type ApiCategory = {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description: string;
  sortOrder?: number;
  _count?: { products?: number };
  imageUrl?: string | null;
  bannerUrl?: string | null;
  icon?: string | null;
  isFeatured?: boolean;
  isTrending?: boolean;
};

type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  type: "DOWNLOAD" | "SERVICE";
  priceCents: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  afterSalesServiceHours?: number;
  averageRating: number | string;
  reviewCount: number;
  salesCount: number;
  deliveryNote?: string | null;
  coverImageUrl?: string | null;
  category: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
      parent?: { name: string; slug: string } | null;
    } | null;
  };
  seller: { sellerProfile?: { storeName: string; slug: string } | null };
  _count?: { inventoryItems?: number; files?: number };
  galleryUrls?: string[];
  videoUrl?: string | null;
  productAttributes?: Record<string, unknown>;
  translations?: Record<
    string,
    {
      title?: string;
      name?: string;
      shortDescription?: string;
      description?: string;
      seoTitle?: string;
      seoDescription?: string;
    }
  >;
  brand?: string | null;
  platform?: string | null;
  region?: string | null;
  country?: string | null;
  server?: string | null;
  language?: string | null;
  deliveryMethod?: string | null;
  productKind?: string | null;
  condition?: string | null;
  stockType?: string | null;
  duration?: string | null;
  warranty?: string | null;
  refundPolicy?: string | null;
  salePriceCents?: number | null;
  minimumOrder?: number;
  maximumOrder?: number | null;
  sku?: string | null;
  tags?: string[];
  publishedAt?: string | null;
  reviews?: Array<{
    id: string;
    rating: number;
    body: string;
    createdAt: string;
    buyer: { firstName: string };
  }>;
};

function iconForSlug(slug: string, index = 0) {
  return (
    catalogCategories.find((category) => category.slug === slug)?.icon ??
    ["◉", "f", "𝕏", "☯", "✈", "♪", "G", "◎", "✉"][index % 9]
  );
}

function badgeFor(product: ApiProduct) {
  if (product.salesCount > 500) return "Popular";
  if (product.salesCount > 100) return "Bundle";
  if (product.type === "SERVICE") return "Service";
  return "New";
}

function normalizePublicMediaUrl(value?: string | null) {
  if (!value) return null;
  return mediaUrl(value);
}

function mapProduct(
  product: ApiProduct,
  index = 0,
  locale = "en",
): CatalogProduct {
  const translation =
    product.translations?.[locale] ??
    (locale.startsWith("zh") ? product.translations?.["zh-CN"] : undefined) ??
    product.translations?.en;
  return {
    id: product.id,
    slug: product.slug,
    category: [
      product.category.parent?.parent?.name,
      product.category.parent?.name,
      product.category.name,
    ]
      .filter(Boolean)
      .join(" / "),
    categorySlug: product.category.slug,
    title: translation?.title ?? translation?.name ?? product.name,
    description: translation?.shortDescription ?? product.shortDescription,
    longDescription: translation?.description ?? product.description,
    seller: product.seller.sellerProfile?.storeName ?? "Marketplace seller",
    sellerSlug: product.seller.sellerProfile?.slug ?? "",
    priceCents:
      product.salePriceCents && product.salePriceCents > 0
        ? Math.min(product.priceCents, product.salePriceCents)
        : product.priceCents,
    priceCnyCents: product.priceCnyCents,
    priceRubCents: product.priceRubCents,
    afterSalesServiceHours: product.afterSalesServiceHours,
    rating: Number(product.averageRating) || 0,
    reviews: product.reviewCount,
    sales: product.salesCount.toLocaleString(),
    delivery:
      product.deliveryNote ||
      (product.type === "DOWNLOAD" ? "Instant download" : "Seller delivery"),
    badge: badgeFor(product),
    type: product.type,
    icon: iconForSlug(product.category.slug, index),
    imageUrl: normalizePublicMediaUrl(product.coverImageUrl),
    stockCount:
      product.type === "SERVICE"
        ? 999
        : Math.max(
            product._count?.inventoryItems ?? 0,
            product._count?.files ?? 0,
          ),
    galleryUrls: product.galleryUrls?.map(
      (url) => normalizePublicMediaUrl(url) ?? url,
    ),
    videoUrl: product.videoUrl,
    attributes: product.productAttributes,
    facts: Object.fromEntries(
      Object.entries({
        brand: product.brand,
        platform: product.platform,
        region: product.region,
        country: product.country,
        server: product.server,
        language: product.language,
        deliveryMethod: product.deliveryMethod,
        productKind: product.productKind,
        condition: product.condition,
        stockType: product.stockType,
        duration: product.duration,
      }).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0,
      ),
    ),
    warranty: product.warranty,
    refundPolicy: product.refundPolicy,
    salePriceCents: product.salePriceCents,
    minimumOrder: product.minimumOrder,
    maximumOrder: product.maximumOrder,
    sku: product.sku,
    tags: product.tags,
    publishedAt: product.publishedAt,
    verifiedReviews: product.reviews?.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      buyerName: review.buyer.firstName || "Verified buyer",
    })),
  };
}

function mapCategories(categories: ApiCategory[]): CatalogCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories
    .map((category, index) => {
      const parent = category.parentId
        ? byId.get(category.parentId)
        : undefined;
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentId: category.parentId ?? null,
        parentSlug: parent?.slug ?? null,
        icon:
          category.icon || iconForSlug(parent?.slug ?? category.slug, index),
        sortOrder: category.sortOrder ?? index,
        productCount: category._count?.products ?? 0,
        imageUrl: normalizePublicMediaUrl(category.imageUrl),
        bannerUrl: normalizePublicMediaUrl(category.bannerUrl),
        isFeatured: category.isFeatured,
        isTrending: category.isTrending,
      };
    })
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    );
}

export function useMarketplaceProducts() {
  const { locale } = useLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  useEffect(() => {
    void apiRequest<{ products: ApiProduct[] }>(
      "/api/marketplace/products?take=96",
    )
      .then((data) =>
        setProducts(
          data.products.map((product, index) =>
            mapProduct(product, index, locale),
          ),
        ),
      )
      .catch(() => setProducts([]));
  }, [locale]);
  return products;
}

export function useMarketplaceCategories() {
  const [categories, setCategories] =
    useState<CatalogCategory[]>(taxonomyCategories);
  useEffect(() => {
    void apiRequest<{ categories: ApiCategory[] }>(
      "/api/marketplace/categories",
    )
      .then((data) => {
        if (data.categories.length)
          setCategories(mapCategories(data.categories));
      })
      .catch(() => undefined);
  }, []);
  return categories;
}

export function useMarketplaceProduct(slug?: string) {
  const { locale } = useLocale();
  const [product, setProduct] = useState<CatalogProduct | undefined>();
  const [loading, setLoading] = useState(Boolean(slug));
  useEffect(() => {
    if (!slug) return;
    void apiRequest<{ product: ApiProduct }>(
      `/api/marketplace/products/${encodeURIComponent(slug)}`,
    )
      .then((data) => setProduct(mapProduct(data.product, 0, locale)))
      .catch(() => setProduct(undefined))
      .finally(() => setLoading(false));
  }, [locale, slug]);
  return { product, loading };
}

export type PublicStore = {
  name: string;
  about: string;
  policy: string;
  rating: number;
  sales: string;
  joined: string;
  mark: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

export type FeaturedStore = {
  name: string;
  slug: string;
  about: string;
  rating: number;
  sales: number;
  joined: string;
  mark: string;
  logoUrl?: string | null;
};

export type PublicMarketplaceReview = {
  id: string;
  buyerName: string;
  initials: string;
  productName: string;
  productSlug: string;
  rating: number;
  body: string;
  createdAt: string;
  date: string;
};

export function useMarketplaceReviews() {
  const [reviews, setReviews] = useState<PublicMarketplaceReview[]>([]);
  useEffect(() => {
    void apiRequest<{
      reviews: Array<{
        id: string;
        rating: number;
        body: string;
        createdAt: string;
        buyer: { firstName: string };
        product: { name: string; slug: string };
      }>;
    }>("/api/marketplace/reviews")
      .then((data) =>
        setReviews(
          data.reviews.map((review) => {
            const buyerName = review.buyer.firstName || "Verified buyer";
            return {
              id: review.id,
              buyerName,
              initials: buyerName.slice(0, 2).toUpperCase(),
              productName: review.product.name,
              productSlug: review.product.slug,
              rating: review.rating,
              body: review.body,
              createdAt: review.createdAt,
              date: new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(review.createdAt)),
            };
          }),
        ),
      )
      .catch(() => setReviews([]));
  }, []);
  return reviews;
}
export function useMarketplaceStores() {
  const [stores, setStores] = useState<FeaturedStore[]>([]);
  useEffect(() => {
    void apiRequest<{
      stores: Array<{
        storeName: string;
        slug: string;
        about: string;
        averageRating: number | string;
        totalSales: number;
        createdAt: string;
        logoUrl?: string | null;
      }>;
    }>("/api/marketplace/stores")
      .then((data) =>
        setStores(
          data.stores.map((store) => ({
            name: store.storeName,
            slug: store.slug,
            about: store.about,
            rating: Number(store.averageRating) || 0,
            sales: store.totalSales,
            joined: new Date(store.createdAt).getFullYear().toString(),
            mark: store.storeName
              .split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            logoUrl: normalizePublicMediaUrl(store.logoUrl),
          })),
        ),
      )
      .catch(() => setStores([]));
  }, []);
  return stores;
}

export function useMarketplaceStore(slug?: string) {
  const { locale } = useLocale();
  const [store, setStore] = useState<PublicStore>();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(Boolean(slug));
  useEffect(() => {
    if (!slug) return;
    void apiRequest<{
      store: {
        storeName: string;
        about: string;
        policy?: string | null;
        averageRating: number | string;
        totalSales: number;
        createdAt: string;
        logoUrl?: string | null;
        bannerUrl?: string | null;
      };
      products: Array<Omit<ApiProduct, "seller">>;
    }>(`/api/marketplace/stores/${encodeURIComponent(slug)}`)
      .then((data) => {
        setStore({
          name: data.store.storeName,
          about: data.store.about,
          policy:
            data.store.policy ||
            "Ysello buyer protection applies to every order.",
          rating: Number(data.store.averageRating),
          sales: data.store.totalSales.toLocaleString(),
          joined: new Date(data.store.createdAt).getFullYear().toString(),
          mark: data.store.storeName
            .split(/\s+/)
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          logoUrl: normalizePublicMediaUrl(data.store.logoUrl),
          bannerUrl: normalizePublicMediaUrl(data.store.bannerUrl),
        });
        setProducts(
          data.products.map((product, index) =>
            mapProduct(
              {
                ...product,
                seller: {
                  sellerProfile: { storeName: data.store.storeName, slug },
                },
              },
              index,
              locale,
            ),
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [locale, slug]);
  return { store, products, loading };
}

export function useMarketplaceCategory(slug?: string) {
  const categories = useMarketplaceCategories();
  const category = useMemo(
    () => categories.find((item) => item.slug === slug),
    [categories, slug],
  );
  return { category, loading: false };
}

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  ImagePlus,
  PackageCheck,
  Save,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { ApiError, apiRequest, mediaUrl } from "../api/client";
import { sellerCategorySelection } from "../commerce/sellerTaxonomy";
import { catalogAttributePresets } from "../data/enterpriseCatalog";

export type SellerCategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  backingId?: string | null;
  isTaxonomyOption?: boolean;
};
type Translation = {
  title?: string;
  name?: string;
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};
export type SellerEditableProduct = {
  id: string;
  slug: string;
  categoryId: string;
  name: string;
  shortDescription: string;
  description: string;
  status: string;
  type: string;
  priceCents: number;
  priceUsdCents?: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  salePriceCents?: number | null;
  wholesalePriceCents?: number | null;
  discountPercent?: number;
  coverImageUrl?: string | null;
  galleryUrls?: string[];
  videoUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
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
  deliveryNote?: string | null;
  stockQuantity?: number;
  minimumOrder?: number;
  maximumOrder?: number | null;
  sku?: string | null;
  tags?: string[];
  afterSalesServiceHours?: number;
  couponSupport?: boolean;
  instantDelivery?: boolean;
  manualDelivery?: boolean;
  digitalDownload?: boolean;
  productAttributes?: Record<string, unknown>;
  translations?: Record<string, Translation>;
  category?: SellerCategoryOption & {
    parent?:
      (SellerCategoryOption & { parent?: SellerCategoryOption | null }) | null;
  };
  files: Array<{
    id: string;
    displayName: string;
    version: number;
    sizeBytes: number;
  }>;
  inventoryItems: Array<{
    id: string;
    deliveredAt?: string | null;
    isActive: boolean;
  }>;
};

const money = (cents?: number | null) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export function SellerProductEditor({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: SellerEditableProduct;
  categories: SellerCategoryOption[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
}) {
  const zh = product.translations?.["zh-CN"] ?? {};
  const ru = product.translations?.ru ?? {};
  const [path, setPath] = useState<string[]>(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const result: string[] = [];
    const marketplaceCategorySlug =
      typeof product.productAttributes?.marketplaceCategorySlug === "string"
        ? product.productAttributes.marketplaceCategorySlug
        : "";
    let current =
      categories.find(
        (category) => category.slug === marketplaceCategorySlug,
      ) ?? byId.get(product.categoryId);
    while (current) {
      result.unshift(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return result;
  });
  const [form, setForm] = useState({
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    chineseTitle: zh.title ?? zh.name ?? "",
    chineseShortDescription: zh.shortDescription ?? "",
    chineseDescription: zh.description ?? "",
    chineseSeoTitle: zh.seoTitle ?? "",
    chineseSeoDescription: zh.seoDescription ?? "",
    russianTitle: ru.title ?? ru.name ?? "",
    russianShortDescription: ru.shortDescription ?? "",
    russianDescription: ru.description ?? "",
    russianSeoTitle: ru.seoTitle ?? "",
    russianSeoDescription: ru.seoDescription ?? "",
    type: product.type,
    priceUsd: money(product.priceUsdCents ?? product.priceCents),
    priceCny: money(product.priceCnyCents),
    priceRub: money(product.priceRubCents),
    salePrice: money(product.salePriceCents),
    wholesalePrice: money(product.wholesalePriceCents),
    discountPercent: product.discountPercent ?? 0,
    galleryUrls: (product.galleryUrls ?? []).join("\n"),
    videoUrl: product.videoUrl ?? "",
    brand: product.brand ?? "",
    platform: product.platform ?? "",
    region: product.region ?? "",
    country: product.country ?? "",
    server: product.server ?? "",
    language: product.language ?? "English",
    deliveryMethod: product.deliveryMethod ?? "Manual delivery",
    productKind: product.productKind ?? "",
    condition: product.condition ?? "New",
    stockType: product.stockType ?? "Single",
    duration: product.duration ?? "",
    warranty: product.warranty ?? "",
    refundPolicy: product.refundPolicy ?? "",
    deliveryNote: product.deliveryNote ?? "",
    stockQuantity: product.stockQuantity ?? 0,
    minimumOrder: product.minimumOrder ?? 1,
    maximumOrder: product.maximumOrder ?? 1,
    sku: product.sku ?? "",
    tags: (product.tags ?? []).join(", "),
    afterSalesServiceHours: product.afterSalesServiceHours ?? 12,
    couponSupport: product.couponSupport ?? false,
    instantDelivery: product.instantDelivery ?? false,
    manualDelivery: product.manualDelivery ?? true,
    digitalDownload: product.digitalDownload ?? product.type === "DOWNLOAD",
    productAttributes: Object.fromEntries(
      Object.entries(product.productAttributes ?? {}).map(([key, value]) => [
        key,
        String(value ?? ""),
      ]),
    ),
    inventoryLines: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(
    product.coverImageUrl ? mediaUrl(product.coverImageUrl) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const levels = useMemo(() => {
    const result: SellerCategoryOption[][] = [];
    let parentId: string | null = null;
    for (let depth = 0; depth < 12; depth += 1) {
      const choices = categories.filter(
        (item) => (item.parentId ?? null) === parentId,
      );
      if (!choices.length) break;
      result.push(choices);
      const selected = path[depth];
      if (!selected) break;
      parentId = selected;
    }
    return result;
  }, [categories, path]);
  const root = categories.find((category) => category.id === path[0]);
  const attributes = root?.slug
    ? (catalogAttributePresets[root.slug] ?? [])
    : [];
  const selectedCategoryId = path[path.length - 1] ?? "";
  const selectedCategory = sellerCategorySelection(
    selectedCategoryId,
    categories,
  );

  async function save(event: FormEvent, submitForReview = false) {
    event.preventDefault();
    setError("");
    if (!selectedCategoryId || levels[path.length]?.length)
      return setError("Complete the category path before saving.");
    if (!selectedCategory?.backingId)
      return setError(
        "The marketplace category could not be connected. Refresh the seller center and try again.",
      );
    if (
      form.name.trim().length < 3 ||
      form.shortDescription.trim().length < 10 ||
      form.description.trim().length < 30 ||
      form.chineseTitle.trim().length < 3 ||
      form.chineseShortDescription.trim().length < 10 ||
      form.chineseDescription.trim().length < 30 ||
      form.russianTitle.trim().length < 3 ||
      form.russianShortDescription.trim().length < 10 ||
      form.russianDescription.trim().length < 30
    )
      return setError(
        "Complete the English, Chinese, and Russian titles and descriptions.",
      );
    if (
      Number(form.priceUsd) < 0.5 ||
      Number(form.priceCny) <= 0 ||
      Number(form.priceRub) <= 0
    )
      return setError("Complete the USD, yuan, and ruble prices.");
    setBusy(true);
    const seoTitle =
      form.seoTitle.trim() ||
      [
        `Buy ${form.name.trim()}`,
        form.platform.trim(),
        form.productKind.trim(),
        form.region.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 70);
    const seoDescription =
      form.seoDescription.trim() ||
      `${form.shortDescription.trim()} Compare delivery, seller details and buyer protection on Ysello.`.slice(
        0,
        170,
      );
    const chineseSeoTitle =
      form.chineseSeoTitle.trim() ||
      `在 Ysello 购买 ${form.chineseTitle.trim()}`.slice(0, 70);
    const chineseSeoDescription =
      form.chineseSeoDescription.trim() ||
      `${form.chineseShortDescription.trim()} 在 Ysello 比较交付方式、卖家信息与买家保障。`.slice(
        0,
        170,
      );
    const russianSeoTitle =
      form.russianSeoTitle.trim() ||
      `Купить ${form.russianTitle.trim()} на Ysello`.slice(0, 70);
    const russianSeoDescription =
      form.russianSeoDescription.trim() ||
      `${form.russianShortDescription.trim()} Сравните условия доставки, продавца и защиту покупателя на Ysello.`.slice(
        0,
        170,
      );
    try {
      await apiRequest(`/api/seller/products/${product.id}`, {
        method: "PATCH",
        body: {
          categoryId: selectedCategory.backingId,
          name: form.name.trim(),
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          seoTitle,
          seoDescription,
          type: form.type,
          priceUsdCents: Math.round(Number(form.priceUsd) * 100),
          priceCnyCents: Math.round(Number(form.priceCny || 0) * 100),
          priceRubCents: Math.round(Number(form.priceRub || 0) * 100),
          ...(form.salePrice
            ? { salePriceCents: Math.round(Number(form.salePrice) * 100) }
            : {}),
          ...(form.wholesalePrice
            ? {
                wholesalePriceCents: Math.round(
                  Number(form.wholesalePrice) * 100,
                ),
              }
            : {}),
          discountPercent: Number(form.discountPercent),
          galleryUrls: form.galleryUrls
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean),
          videoUrl: form.videoUrl || null,
          brand: form.brand,
          platform: form.platform,
          region: form.region,
          country: form.country,
          server: form.server,
          language: form.language,
          deliveryMethod: form.deliveryMethod,
          productKind: form.productKind,
          condition: form.condition,
          stockType: form.stockType,
          duration: form.duration,
          warranty: form.warranty,
          refundPolicy: form.refundPolicy,
          deliveryNote: form.deliveryNote,
          stockQuantity: Number(form.stockQuantity),
          minimumOrder: Number(form.minimumOrder),
          maximumOrder: Number(form.maximumOrder),
          sku: form.sku,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          afterSalesServiceHours: Number(form.afterSalesServiceHours),
          couponSupport: form.couponSupport,
          instantDelivery: form.instantDelivery,
          manualDelivery: form.manualDelivery,
          digitalDownload: form.digitalDownload,
          productAttributes: {
            ...form.productAttributes,
            marketplaceCategorySlug: selectedCategory.slug,
            marketplaceCategoryName: selectedCategory.name,
            marketplaceCategoryPath: selectedCategory.pathLabel,
          },
          translations: {
            en: {
              title: form.name.trim(),
              shortDescription: form.shortDescription.trim(),
              description: form.description.trim(),
              seoTitle,
              seoDescription,
            },
            "zh-CN": {
              title: form.chineseTitle.trim(),
              shortDescription: form.chineseShortDescription.trim(),
              description: form.chineseDescription.trim(),
              seoTitle: chineseSeoTitle,
              seoDescription: chineseSeoDescription,
            },
            ru: {
              title: form.russianTitle.trim(),
              shortDescription: form.russianShortDescription.trim(),
              description: form.russianDescription.trim(),
              seoTitle: russianSeoTitle,
              seoDescription: russianSeoDescription,
            },
          },
        },
      });
      if (image) {
        const data = new FormData();
        data.append("coverImage", image);
        await apiRequest(`/api/seller/products/${product.id}/image`, {
          method: "POST",
          body: data,
        });
      }
      if (form.inventoryLines.trim())
        await apiRequest(
          `/api/seller/products/${product.id}/inventory/manual`,
          {
            method: "POST",
            body: { inventoryLines: form.inventoryLines.trim() },
          },
        );
      if (submitForReview)
        await apiRequest(`/api/seller/products/${product.id}/submit`, {
          method: "POST",
        });
      await onSaved(
        submitForReview
          ? "Product updated and submitted for review."
          : "All product changes were saved.",
      );
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Product changes could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="seller-editor-screen"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${product.name}`}
    >
      <header className="seller-editor-topbar">
        <button type="button" onClick={onClose}>
          <ArrowLeft /> Products
        </button>
        <div>
          <small>EDIT PRODUCT</small>
          <strong>{product.name}</strong>
        </div>
        <span className={`status-pill ${product.status.toLowerCase()}`}>
          {product.status.replaceAll("_", " ")}
        </span>
        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </button>
      </header>
      <form onSubmit={(event) => void save(event)}>
        <aside>
          <nav>
            <a href="#edit-basic">Basic details</a>
            <a href="#edit-language">Languages</a>
            <a href="#edit-pricing">Pricing & stock</a>
            <a href="#edit-delivery">Delivery</a>
            <a href="#edit-media">Media</a>
          </nav>
          <div>
            <PackageCheck />
            <strong>Current delivery</strong>
            <small>
              {product.files.length} files ·{" "}
              {
                product.inventoryItems.filter(
                  (item) => item.isActive && !item.deliveredAt,
                ).length
              }{" "}
              stock rows
            </small>
          </div>
        </aside>
        <main>
          {error ? (
            <div className="dashboard-message error">{error}</div>
          ) : null}
          <section id="edit-basic">
            <header>
              <FileText />
              <div>
                <h2>Basic product details</h2>
                <p>
                  Choose the exact category and edit the information buyers see
                  first.
                </p>
              </div>
            </header>
            <div className="seller-editor-category-path">
              {levels.map((choices, depth) => (
                <label key={`${depth}-${path[depth - 1] ?? "root"}`}>
                  <span>
                    {depth === 0
                      ? "Main category"
                      : depth === 1
                        ? "Subcategory"
                        : depth === 2
                          ? "Product / game"
                          : `Category level ${depth + 1}`}
                  </span>
                  <select
                    required
                    value={path[depth] ?? ""}
                    onChange={(event) =>
                      setPath(
                        [...path.slice(0, depth), event.target.value].filter(
                          Boolean,
                        ),
                      )
                    }
                  >
                    <option value="">Choose option</option>
                    {choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {attributes.length ? (
              <div className="seller-editor-attributes">
                <strong>
                  <Sparkles /> Category attributes
                </strong>
                <div>
                  {attributes.map((attribute) => (
                    <label key={attribute.key}>
                      <span>{attribute.label}</span>
                      <select
                        required={!attribute.optional}
                        value={form.productAttributes[attribute.key] ?? ""}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            productAttributes: {
                              ...form.productAttributes,
                              [attribute.key]: event.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Choose</option>
                        {attribute.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          <section id="edit-language">
            <header>
              <FileText />
              <div>
                <h2>Multilingual content</h2>
                <p>
                  Complete each field across English, Chinese, and Russian
                  before moving to the next field.
                </p>
              </div>
            </header>
            <div className="seller-multilingual-sequence">
              <section>
                <h3>
                  <b>1</b> Product titles
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>English title</span>
                    <input
                      required
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>中文标题</span>
                    <input
                      required
                      value={form.chineseTitle}
                      onChange={(event) =>
                        setForm({ ...form, chineseTitle: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Русское название</span>
                    <input
                      required
                      value={form.russianTitle}
                      onChange={(event) =>
                        setForm({ ...form, russianTitle: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>2</b> Short descriptions
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>English short description</span>
                    <textarea
                      required
                      rows={3}
                      value={form.shortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          shortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>中文简短描述</span>
                    <textarea
                      required
                      rows={3}
                      value={form.chineseShortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseShortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Краткое описание</span>
                    <textarea
                      required
                      rows={3}
                      value={form.russianShortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianShortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>3</b> Full descriptions
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>English full description</span>
                    <textarea
                      required
                      rows={8}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>中文完整描述</span>
                    <textarea
                      required
                      rows={8}
                      value={form.chineseDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Полное описание</span>
                    <textarea
                      required
                      rows={8}
                      value={form.russianDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>4</b> Prices
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>USD price ($)</span>
                    <input
                      required
                      type="number"
                      min="0.50"
                      step="0.01"
                      value={form.priceUsd}
                      onChange={(event) =>
                        setForm({ ...form, priceUsd: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Chinese yuan price (¥)</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.priceCny}
                      onChange={(event) =>
                        setForm({ ...form, priceCny: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Russian ruble price (₽)</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.priceRub}
                      onChange={(event) =>
                        setForm({ ...form, priceRub: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>5</b> SEO titles
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>English SEO title</span>
                    <input
                      maxLength={70}
                      value={form.seoTitle}
                      onChange={(event) =>
                        setForm({ ...form, seoTitle: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>中文 SEO 标题</span>
                    <input
                      maxLength={70}
                      value={form.chineseSeoTitle}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseSeoTitle: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Русский SEO-заголовок</span>
                    <input
                      maxLength={70}
                      value={form.russianSeoTitle}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianSeoTitle: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>6</b> SEO meta descriptions
                </h3>
                <div className="seller-editor-grid three">
                  <label>
                    <span>English meta description</span>
                    <textarea
                      maxLength={170}
                      rows={3}
                      value={form.seoDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          seoDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>中文 SEO 描述</span>
                    <textarea
                      maxLength={170}
                      rows={3}
                      value={form.chineseSeoDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseSeoDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Русское метаописание</span>
                    <textarea
                      maxLength={170}
                      rows={3}
                      value={form.russianSeoDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianSeoDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
            </div>
          </section>
          <section id="edit-pricing">
            <header>
              <Tag />
              <div>
                <h2>Pricing and stock</h2>
                <p>Edit every price, identifier, and inventory rule.</p>
              </div>
            </header>
            <div className="seller-editor-grid three">
              {(
                [
                  ["salePrice", "Sale price"],
                  ["wholesalePrice", "Wholesale price"],
                  ["discountPercent", "Discount %"],
                  ["stockQuantity", "Stock quantity"],
                  ["minimumOrder", "Minimum order"],
                  ["maximumOrder", "Maximum order"],
                  ["sku", "SKU"],
                  ["tags", "Tags"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    required={["priceUsd", "priceCny", "priceRub"].includes(
                      key,
                    )}
                    type={["sku", "tags"].includes(key) ? "text" : "number"}
                    min={
                      [
                        "priceUsd",
                        "priceCny",
                        "priceRub",
                        "salePrice",
                        "wholesalePrice",
                      ].includes(key)
                        ? 0
                        : undefined
                    }
                    step={
                      key.toLowerCase().includes("price") ? ".01" : undefined
                    }
                    value={form[key]}
                    onChange={(event) =>
                      setForm({ ...form, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                <span>Product type</span>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                >
                  <option value="DOWNLOAD">Digital product</option>
                  <option value="SERVICE">Service</option>
                </select>
              </label>
            </div>
          </section>
          <section id="edit-delivery">
            <header>
              <SlidersHorizontal />
              <div>
                <h2>Product specifications and delivery</h2>
                <p>All searchable details and buyer policies are editable.</p>
              </div>
            </header>
            <div className="seller-editor-grid three">
              {(
                [
                  ["brand", "Brand"],
                  ["platform", "Platform"],
                  ["region", "Region"],
                  ["country", "Country"],
                  ["server", "Server"],
                  ["language", "Language"],
                  ["productKind", "Product type"],
                  ["condition", "Condition"],
                  ["stockType", "Stock type"],
                  ["duration", "Duration"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    value={form[key]}
                    onChange={(event) =>
                      setForm({ ...form, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                <span>Delivery method</span>
                <select
                  value={form.deliveryMethod}
                  onChange={(event) =>
                    setForm({ ...form, deliveryMethod: event.target.value })
                  }
                >
                  <option>Manual delivery</option>
                  <option>Instant delivery</option>
                  <option>Automatic delivery</option>
                  <option>Digital download</option>
                  <option>Seller service</option>
                </select>
              </label>
              <label>
                <span>After-sales hours</span>
                <input
                  type="number"
                  min={12}
                  value={form.afterSalesServiceHours}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      afterSalesServiceHours: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              <span>Warranty</span>
              <textarea
                rows={3}
                value={form.warranty}
                onChange={(event) =>
                  setForm({ ...form, warranty: event.target.value })
                }
              />
            </label>
            <label>
              <span>Refund policy</span>
              <textarea
                rows={4}
                value={form.refundPolicy}
                onChange={(event) =>
                  setForm({ ...form, refundPolicy: event.target.value })
                }
              />
            </label>
            <label>
              <span>Buyer delivery note</span>
              <textarea
                rows={3}
                value={form.deliveryNote}
                onChange={(event) =>
                  setForm({ ...form, deliveryNote: event.target.value })
                }
              />
            </label>
            <div className="seller-option-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={form.instantDelivery}
                  onChange={(event) =>
                    setForm({ ...form, instantDelivery: event.target.checked })
                  }
                />{" "}
                Instant delivery
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.manualDelivery}
                  onChange={(event) =>
                    setForm({ ...form, manualDelivery: event.target.checked })
                  }
                />{" "}
                Manual delivery
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.digitalDownload}
                  onChange={(event) =>
                    setForm({ ...form, digitalDownload: event.target.checked })
                  }
                />{" "}
                Digital download
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.couponSupport}
                  onChange={(event) =>
                    setForm({ ...form, couponSupport: event.target.checked })
                  }
                />{" "}
                Coupon support
              </label>
            </div>
          </section>
          <section id="edit-media">
            <header>
              <ImagePlus />
              <div>
                <h2>Images, gallery, video and inventory</h2>
                <p>Replace the cover and maintain all delivery resources.</p>
              </div>
            </header>
            <div className="seller-editor-media">
              <label className="seller-editor-cover">
                {preview ? (
                  <img src={preview} alt="Product cover preview" />
                ) : (
                  <ImagePlus />
                )}
                <strong>{image ? image.name : "Replace cover image"}</strong>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setImage(event.target.files?.[0] ?? null)
                  }
                />
              </label>
              <div>
                <label>
                  <span>Gallery image URLs — one per line</span>
                  <textarea
                    rows={5}
                    value={form.galleryUrls}
                    onChange={(event) =>
                      setForm({ ...form, galleryUrls: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Product video URL</span>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(event) =>
                      setForm({ ...form, videoUrl: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>
            <label>
              <span>Add inventory rows — one per line</span>
              <textarea
                rows={5}
                value={form.inventoryLines}
                onChange={(event) =>
                  setForm({ ...form, inventoryLines: event.target.value })
                }
                placeholder="Leave blank if you do not want to add stock now"
              />
            </label>
          </section>
        </main>
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            <Save /> {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={(event) => void save(event as unknown as FormEvent, true)}
          >
            <Send /> Save & submit
          </button>
        </footer>
      </form>
    </div>
  );
}

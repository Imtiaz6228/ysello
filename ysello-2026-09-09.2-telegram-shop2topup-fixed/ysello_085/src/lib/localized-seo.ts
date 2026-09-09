import { uiText } from "../i18n/marketplaceCopy.js";
import { escapeHtml } from "./seo-html.js";
export function requestLocale(value: unknown) {
  return value === "zh-CN" || value === "ru" ? value : "en";
}
export function localizedSeoHtml(
  html: string,
  requestUrl: string,
  origin: string,
) {
  const request = new URL(requestUrl, origin);
  const locale = requestLocale(request.searchParams.get("lang"));
  const existing = html.match(
    /<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)/i,
  )?.[1];
  const canonical = new URL(
    existing
      ? new URL(existing.replaceAll("&amp;", "&"), origin).pathname
      : request.pathname,
    origin,
  );
  const page = Number(request.searchParams.get("page"));
  if (Number.isSafeInteger(page) && page > 1)
    canonical.searchParams.set("page", String(page));
  if (request.pathname === "/catalog" && request.searchParams.get("category"))
    canonical.searchParams.set(
      "category",
      request.searchParams.get("category")!,
    );
  const base = canonical.toString();
  if (locale !== "en") canonical.searchParams.set("lang", locale);
  html = html.replace(/<html\b[^>]*>/i, `<html lang="${locale}">`);
  html = html.replace(
    /<link\s+rel=["'](?:canonical|alternate)["'][^>]*>/gi,
    "",
  );
  const alternate = ["en", "zh-CN", "ru", "x-default"]
    .map((lang) => {
      const url = new URL(base);
      if (lang !== "en" && lang !== "x-default")
        url.searchParams.set("lang", lang);
      return `<link rel="alternate" hreflang="${lang}" data-ysello-hreflang="true" href="${escapeHtml(url.toString())}" />`;
    })
    .join("");
  html = html.replace(
    "</head>",
    `<link rel="canonical" href="${escapeHtml(canonical.toString())}" />${alternate}</head>`,
  );
  html = html.replace(
    /(<meta property="og:locale" content=")[^"]*/i,
    `$1${locale === "ru" ? "ru_RU" : locale === "zh-CN" ? "zh_CN" : "en_US"}`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*/i,
    `$1${escapeHtml(canonical.toString())}`,
  );
  if (
    request.searchParams.has("q") ||
    request.searchParams.has("stock") ||
    request.searchParams.has("sort")
  )
    html = html.replace(
      /(<meta name="(?:robots|googlebot|bingbot)" content=")[^"]*/g,
      "$1noindex, follow",
    );
  if (locale !== "en") {
    const zh = locale === "zh-CN";
    const path = request.pathname;
    const genericDescription = zh
      ? "在 Ysello 选购数字商品与社交账号。比较价格、库存和交付条款，探索专业卖家的店铺。"
      : "Цифровые товары и социальные аккаунты на Ysello. Сравнивайте цены, наличие и условия доставки в магазинах продавцов.";
    if (path === "/" || path === "/catalog") {
      const title = zh
        ? "Ysello 数字商城 | 社交账号与数字商品"
        : "Ysello — цифровые товары и социальные аккаунты";
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
      html = html.replace(
        /(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*/g,
        `$1${genericDescription}`,
      );
      html = html.replace(
        /(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*/g,
        `$1${title}`,
      );
    }
    html = html.replaceAll(
      " digital products and services · Ysello",
      zh ? " 数字商品与服务 · Ysello" : " — цифровые товары и услуги · Ysello",
    );
  }
  // Translate text nodes only; never rewrite scripts, structured data, URLs or product identifiers.
  html = html.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1>|>([^<]+)</gi,
    (whole, _tag, text) =>
      text && uiText(text, locale) !== text
        ? `>${escapeHtml(uiText(text, locale))}<`
        : whole,
  );
  if (locale !== "en")
    html = html.replace(/href="(\/[^"#]*)"/g, (_whole, value) => {
      const url = new URL(value.replaceAll("&amp;", "&"), origin);
      url.searchParams.set("lang", locale);
      return `href="${escapeHtml(url.pathname + url.search)}"`;
    });
  return html;
}

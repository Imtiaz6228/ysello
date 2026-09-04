import { useEffect, useMemo } from "react";
import { useLocale } from "../i18n/LocaleContext";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const viteEnvironment = import.meta.env || {};
const browserOrigin =
  typeof window === "undefined" ? "https://ysello.com" : window.location.origin;
const configuredOrigin = String(
  viteEnvironment.VITE_SITE_URL ||
    (browserOrigin.includes("localhost") ||
    browserOrigin.includes("terminal.local") ||
    browserOrigin.includes("chatgpt.site")
      ? "https://ysello.com"
      : browserOrigin),
).replace(/\/+$/, "");

const indexDirective =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const noIndexDirective = "noindex, nofollow, noarchive";

function setMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function absoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `${configuredOrigin}${value.startsWith("/") ? value : `/${value}`}`;
}

function canonicalPathname(value: string) {
  try {
    const url = new URL(value, configuredOrigin);
    const pathname =
      url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    const pathname = value.split(/[?#]/, 1)[0] || "/";
    return absoluteUrl(
      pathname === "/" ? pathname : pathname.replace(/\/+$/, ""),
    );
  }
}

export function Seo({
  title,
  description,
  canonicalPath = window.location.pathname,
  image,
  imageAlt,
  type = "website",
  noIndex = false,
  schema,
}: SeoProps) {
  const { locale } = useLocale();
  const schemaText = useMemo(
    () => (schema ? JSON.stringify(schema) : ""),
    [schema],
  );

  useEffect(() => {
    const pageTitle = title.toLowerCase().includes("ysello")
      ? title
      : `${title} · Ysello`;
    const canonicalBase = canonicalPathname(canonicalPath);
    const canonical = new URL(canonicalBase);
    if (locale === "zh-CN" || locale === "ru")
      canonical.searchParams.set("lang", locale);
    const canonicalUrl = canonical.toString();
    document.title = pageTitle;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? noIndexDirective : indexDirective,
    );
    setMeta(
      'meta[name="googlebot"]',
      "name",
      "googlebot",
      noIndex ? noIndexDirective : indexDirective,
    );
    setMeta(
      'meta[name="bingbot"]',
      "name",
      "bingbot",
      noIndex ? noIndexDirective : indexDirective,
    );
    setMeta(
      'meta[property="og:site_name"]',
      "property",
      "og:site_name",
      "Ysello",
    );
    setMeta(
      'meta[property="og:locale"]',
      "property",
      "og:locale",
      locale.replace("-", "_") || "en_US",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      description,
    );
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      "summary_large_image",
    );
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      description,
    );
    const imageUrl = absoluteUrl(image || "/og-default.png");
    const resolvedImageAlt =
      imageAlt || (image ? title : "Ysello digital marketplace");
    setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    setMeta(
      'meta[property="og:image:alt"]',
      "property",
      "og:image:alt",
      resolvedImageAlt,
    );
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);
    setMeta(
      'meta[name="twitter:image:alt"]',
      "name",
      "twitter:image:alt",
      resolvedImageAlt,
    );

    let canonicalLink = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    document.head
      .querySelectorAll('link[data-ysello-hreflang="true"]')
      .forEach((link) => link.remove());
    const alternates: Array<[string, string | null]> = [
      ["en", null],
      ["zh-CN", "zh-CN"],
      ["ru", "ru"],
      ["x-default", null],
    ];
    for (const [hreflang, lang] of alternates) {
      const alternate = document.createElement("link");
      alternate.rel = "alternate";
      alternate.hreflang = hreflang;
      alternate.dataset.yselloHreflang = "true";
      const href = new URL(canonicalBase);
      if (lang) href.searchParams.set("lang", lang);
      alternate.href = href.toString();
      document.head.appendChild(alternate);
    }

    const id = "page-structured-data";
    document.getElementById(id)?.remove();
    if (schemaText) {
      const script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      script.text = schemaText;
      document.head.appendChild(script);
    }
    return () => {
      document.getElementById(id)?.remove();
      document.head
        .querySelectorAll('link[data-ysello-hreflang="true"]')
        .forEach((link) => link.remove());
    };
  }, [
    canonicalPath,
    description,
    image,
    imageAlt,
    locale,
    noIndex,
    schemaText,
    title,
    type,
  ]);
  return null;
}

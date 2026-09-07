# Ysello search + AI indexing setup — 2026-09-07

This build is prepared for Google, Bing/Copilot, Baidu/Yandex-style crawling and major AI search crawlers.

## What is in code

- Canonical public origin: `https://ysello.com`
- English canonical storefront plus crawlable Chinese (`?lang=zh-CN`) and Russian (`?lang=ru`) alternates.
- Self-referencing canonical + `hreflang` / `x-default` annotations.
- Server-rendered public catalog/category/product HTML so crawlers do not depend on browser JavaScript for the core listing text.
- Sitemap index: `/sitemap.xml`
- Page sitemap: `/sitemap-pages.xml`
- Category sitemap: `/sitemap-categories.xml`
- Product sitemap: `/sitemap-products.xml`
- Store sitemap: `/sitemap-stores.xml`
- Accurate `lastmod` from database `updatedAt` for catalog entities.
- `/robots.txt` allows public search/AI discovery and blocks account/admin/checkout/API URLs.
- `/llms.txt` provides a concise machine-readable marketplace map for AI systems that use the convention.
- `/indexnow-key.txt` proves domain control for IndexNow.
- Production API startup notifies IndexNow about core pages and catalog URLs changed in the last 30 days.
- Search/filter URLs using `q`, `stock`, or `sort` remain `noindex,follow` to avoid low-value duplicate index pages.

## Deployment variables

### Vercel

Keep:

```env
APP_URL=https://ysello.com
VITE_SITE_URL=https://ysello.com
API_URL=https://api.ysello.com
VITE_API_BASE_URL=https://api.ysello.com
```

Add real verification tokens only after the webmaster platform gives them to you:

```env
VITE_GOOGLE_SITE_VERIFICATION=
VITE_BING_SITE_VERIFICATION=
VITE_YANDEX_SITE_VERIFICATION=
VITE_BAIDU_SITE_VERIFICATION=
```

### Railway API

Make sure these canonical URLs are set:

```env
APP_URL=https://ysello.com
API_URL=https://api.ysello.com
CORS_ORIGIN=https://ysello.com,https://www.ysello.com
```

No IndexNow secret variable is required. Its ownership key is intentionally public and served at `/indexnow-key.txt`.

## After deployment

1. Open `https://ysello.com/robots.txt` and confirm HTTP 200.
2. Open `https://ysello.com/sitemap.xml` and confirm the four child sitemaps are listed.
3. Submit `https://ysello.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
4. Request indexing for the homepage and the most important category pages in Google Search Console.
5. Add the site to Bing Webmaster Tools; IndexNow will handle changed URLs automatically after deployment.
6. For Baidu/Yandex, add the verification token they provide to the matching Vercel environment variable and redeploy, then submit the sitemap in their webmaster console.

Indexing and ranking are controlled by the search engines. This configuration improves discovery, language targeting, crawl efficiency and eligibility; it cannot guarantee a #1 ranking.

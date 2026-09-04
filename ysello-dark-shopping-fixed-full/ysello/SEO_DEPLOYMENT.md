# Search indexing and production domain setup

The application generates public metadata, data-backed crawler HTML, `robots.txt`, and `sitemap.xml` from the preferred URL in `APP_URL`. Complete the items below after the final domain is connected.

## Required domain values

Set both frontend and backend deployment variables to the same preferred public origin, with HTTPS and no trailing path:

```env
APP_URL=https://your-preferred-domain.example
VITE_SITE_URL=https://your-preferred-domain.example
```

Set `VITE_API_BASE_URL` and `API_URL` to the deployed API origin. Configure the hosting provider to redirect every alternate domain, including the unwanted `www` or non-`www` hostname, to `APP_URL` with one permanent redirect. Do not set `APP_URL` to a temporary preview deployment.

## Webmaster verification

Get each token from the relevant webmaster platform and add only the real values to the frontend production environment:

```env
VITE_GOOGLE_SITE_VERIFICATION=
VITE_BING_SITE_VERIFICATION=
VITE_YANDEX_SITE_VERIFICATION=
VITE_BAIDU_SITE_VERIFICATION=
```

The Vite HTML build adds a verification meta tag only when a value is non-empty. No placeholder or fabricated token is published. DNS or platform-provided HTML-file verification can be used instead when preferred.

## Post-deployment checks

1. Confirm the preferred domain redirects once from HTTP to HTTPS and once at most from the alternate hostname.
2. Open `/robots.txt` and confirm its sitemap line uses the preferred domain.
3. Open `/sitemap.xml`, validate it as XML, and spot-check product, category, store, guide, policy, and homepage URLs.
4. Confirm a valid public URL returns `200`, an invalid URL returns `404`, and account, checkout, dashboard, seller, support, and admin pages include `X-Robots-Tag: noindex`.
5. Inspect the raw HTML of the homepage, catalog, one category, one product, one store, one guide, and one policy page. Each should contain a unique title, description, canonical URL, heading, crawlable links, and structured data where applicable.
6. Submit the canonical `/sitemap.xml` URL in each webmaster platform and request indexing for the homepage and catalog. Do not submit search-result URLs or private pages.

## Ongoing maintenance

- Keep listing SEO titles and descriptions accurate when product content changes.
- Remove deleted or suspended listings from internal links; the sitemap already includes only public, approved inventory.
- Revalidate structured data after schema or product-field changes.
- Monitor crawl errors, indexed-page counts, Core Web Vitals, security warnings, and manual actions after every release.

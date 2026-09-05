# Ysello Dark.shopping 502 + Storefront/Mobile Fix

Integration build: **2026-09-05.1**

## What this build fixes

### 1. Product import 502 recovery
- Ordinary supplier product browsing uses `GET /product/list` first.
- Structured/selected-ID imports use documented POST encodings.
- If Dark.shopping's bulk `product/list` gateway returns a retryable 5xx/invalid-response failure, Ysello retries the selected products with `product/view` one ID at a time.
- The existing supplier client rate limiter remains in force (maximum two requests per second).
- Import batches are capped at 30 products so the one-by-one recovery path does not run into normal web request timeouts. Larger catalogs can be imported in multiple batches.
- Authentication/permission/rate-limit errors are not hidden as successful imports.

### 2. Imported categories on the public storefront
- The public categories API marks Dark.shopping-imported categories as supplier categories.
- Dynamic supplier categories are loaded by slug even when they are not part of Ysello's original static taxonomy.
- Direct category URLs no longer depend on a previous desktop navigation request having populated the category cache.

### 3. Mobile visibility
- Imported categories are exposed in the mobile marketplace drawer.
- Supplier categories appear in the search category selector.
- The supplier marketplace section is explicitly visible and responsive on mobile, overriding older homepage CSS that hid dense desktop sections.
- Supplier category pages default to the compact list view on mobile and desktop.

### 4. Dark.shopping-inspired Ysello storefront presentation
- Added a dense live-catalog section on the homepage.
- Added compact category tiles using the real supplier category image/icon when provided.
- Added marketplace product rows using real imported product miniatures, current stock, live price, quality/sales metadata, delivery information, and a direct Buy button.
- Catalog quick filters include high-stock supplier categories.
- Supplier category pages have an identifiable marketplace header and dense product presentation.
- Ysello branding is preserved; this is an inspired layout, not a clone of Dark.shopping.

### 5. Supplier metadata
New/synced Dark.shopping products retain safe public merchandising metadata including supplier category/group, quality, supplier purchase count, views, guarantee period, and remote product ID. Supplier credentials/delivery secrets are not added to public attributes.

## Deployment

There is **no new Prisma migration** in this build.

1. Deploy/restart the Railway API using this source.
2. Confirm `DARK_SHOPPING_API_KEY` exists only in the backend service environment.
3. Deploy the matching frontend build.
4. In **Admin -> Dark Shopping resale**, confirm the integration version is **2026-09-05.1**.
5. Click **Test connection**.
6. Load supplier categories/products.
7. Add a supplier category to Ysello if it is not already mapped.
8. Import a small batch (3-10 products first). You can import up to 30 at once.
9. Run **Sync all** once for existing Dark.shopping listings so older imports receive the newer quality/sales merchandising metadata.
10. Verify the homepage on desktop and mobile, then open an imported category directly by its category URL.

## If 502 continues

If both `product/list` and the individual `product/view` fallback return 502, the remaining failure is upstream of the Ysello bulk parser (Dark.shopping/API gateway or account API access). The application will surface a supplier error rather than creating fake products or marking an import successful.

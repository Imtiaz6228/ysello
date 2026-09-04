# Dark.shopping storefront visibility fix

Integration marker: **2026-09-04.3**

## Root cause

Dark.shopping category imports use supplier-specific slugs such as `dark-shopping-<id>-...`. The public marketplace API previously allowed only the static Ysello taxonomy slugs, so approved supplier products assigned to imported supplier categories were excluded from `/api/marketplace/products` and their categories were excluded from `/api/marketplace/categories`.

The admin import form also defaulted `Publish immediately` to off, which created valid Dark.shopping listings in `DRAFT` state. Those products correctly existed in Admin but could not appear on the homepage or category pages.

## Fix

- Public marketplace category policy now includes both the normal Ysello taxonomy and categories tagged `supplier:dark-shopping`.
- Product detail/list endpoints inherit the same policy, so Dark.shopping products can render on the homepage, catalog, search, and category pages.
- Dark.shopping product imports default to publish selected products immediately.
- Existing legacy Dark.shopping products that are still `DRAFT` are promoted to `APPROVED` by migration `202609040002_dark_shopping_storefront_visibility`.
- The same migration enables only those promoted supplier listings. Products already marked `HIDDEN` remain paused.
- The supplier listing action now says `Publish` for a draft instead of the ambiguous `Enable`.

## Deployment

Railway must run `npx prisma migrate deploy` before starting the new API build. After the matching frontend/API deployment, the Dark Shopping resale panel should display `Integration 2026-09-04.3`.

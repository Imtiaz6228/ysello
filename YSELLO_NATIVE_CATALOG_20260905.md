# Ysello native catalog release 2026-09-05.4

This release keeps Dark.shopping as a private backend supplier while presenting the public catalog as a native Ysello marketplace.

## What changed

- Admin can select more than 30 products. The frontend automatically submits the selection in safe batches of 25 to the existing protected import endpoint.
- "Select eligible page" now selects the whole loaded page instead of truncating at 30.
- Imported category mappings are normalized to clean Ysello category slugs. Known social platforms map into Ysello's native account taxonomy (for example Instagram -> `instagram-accounts`).
- Existing supplier-only categories are merged into the matching Ysello category when the resale dashboard loads; their products are moved with them.
- New supplier product slugs use a Ysello suffix instead of a supplier abbreviation.
- Supplier miniatures are no longer published as public product cover images.
- Recognized platforms render native brand artwork using bundled brand icons and official color treatments.
- Unknown imported items render a Ysello marketplace artwork tile instead of supplier artwork.
- Homepage, catalog, mobile drawer, category pages, cards and product detail pages use the same native artwork system.
- Public wording no longer says "supplier stock", "supplier catalog", or otherwise exposes the upstream catalog.
- Mobile imported-category sections and social-platform selectors wrap into a grid instead of horizontal scrolling.

## Deployment

1. Commit these files to `Imtiaz6228/ysello` on branch `main`.
2. Deploy Railway/API first.
3. Confirm `/api/health` reports `releaseId: 2026-09-05.4`.
4. Deploy the matching frontend.
5. Open Admin -> Dark Shopping resale once. This performs the safe existing-category normalization.
6. Run Sync all once so existing supplier products receive the new public cover/wording fields.
7. Test homepage, catalog, one social category and one product page on mobile and desktop.

No new Prisma migration is required.

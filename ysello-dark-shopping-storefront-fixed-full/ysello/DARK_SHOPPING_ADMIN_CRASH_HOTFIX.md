# Dark Shopping admin crash hotfix

Integration build marker: **2026-09-04.3**

## Symptom fixed

Opening **Admin → Dark Shopping resale** could fall through to the global React
error boundary and show “Something went wrong / This page could not be
displayed.”

## Root causes hardened

1. The admin UI called numeric methods directly on supplier values. Provider or
   proxy responses containing numeric strings (for example a balance or price)
   could therefore throw during React rendering.
2. A newer frontend could receive an older/mismatched Railway `/resale` payload
   and store it without validating the contract, producing a render-time crash.
3. Missing Dark Shopping Prisma tables/columns could make the supplier overview
   fail with an opaque server error.
4. Order create/status/download responses were trusted without runtime shape
   validation.

## Fixes

- Normalize Dark Shopping catalog, price, quantity, balance, booleans,
  pagination, order IDs/statuses, and delivery responses at the backend API
  boundary.
- Validate the `/resale` payload before putting it into React state.
- Render a deployment-mismatch message instead of crashing when the API contract
  is old/unexpected.
- Detect Prisma P2021/P2022 for the Dark Shopping overview and render a specific
  migration-required message.
- Keep the global 30% supplier markup locked server-side.
- Keep the API key server-side only.
- Expose build marker `Integration 2026-09-04.3` in the supplier panel so the
  active backend version is visible after deployment.

## Correct deployment order

1. Deploy the **Railway API service first** from the same latest project source.
2. Confirm the Railway pre-deploy step runs Prisma migrations successfully.
3. Confirm `DARK_SHOPPING_API_KEY` exists only on the Railway API service.
4. Redeploy/restart Railway and verify `/api/health` is healthy in Railway.
5. Deploy the matching Vercel frontend.
6. Open Admin → Dark Shopping resale. The panel should show
   `Integration 2026-09-04.3`.
7. Run **Test connection**, then load categories/products. Do not create a test
   supplier purchase unless it is a legitimate order.

If the marker is absent after deployment, the browser is not talking to this
fixed API/frontend build. If the panel says “Dark Shopping database update
required,” inspect the Railway pre-deploy log and run the committed Prisma
migrations on that API service.

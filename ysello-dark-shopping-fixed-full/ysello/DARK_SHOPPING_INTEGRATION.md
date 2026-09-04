# Ysello ↔ Dark.shopping supplier integration

Current integration marker: **2026-09-04.2**. The admin supplier panel displays this marker after the matching Railway API/frontend build is deployed.

This project uses the official Dark.shopping v1 supplier API at
`https://dark.shopping/api/v1`. The supplier credential is server-side only and
must be configured as `DARK_SHOPPING_API_KEY` in the backend deployment. Do not
put the key in frontend code, a `VITE_*` variable, URLs generated for users,
logs, notifications, or source control.

## Implemented provider operations

- `category/list` — load supplier categories.
- `group/list` and `attribute/list` — supplier taxonomy/filter metadata.
- `product/list` (POST form parameters) and `product/view` — product catalog,
  price, stock, minimum quantity, and automatic/manual delivery information.
- `user/balance` — connection/balance check before supplier purchase.
- `order/create` — supplier purchase with a stable Ysello order-item
  `idempotence_id` to prevent duplicate remote orders.
- `order/status` — poll pending supplier orders.
- `order/download` — obtain the protected delivery link after completion.

Requests are throttled to at most two per second. Responses are requested as
JSON. Provider links and errors are scrubbed so the API key does not propagate
into Ysello responses or logs.

## Admin workflow

Open **Admin → Marketplace → Dark Shopping resale**.

1. Click **Test connection**. A successful call displays the current supplier
   balance without exposing the key.
2. Select a Dark.shopping category and click **Add category to Ysello**. The
   mapping is idempotent; selecting it again will reuse/reactivate the existing
   local category rather than duplicate it.
3. Load/search supplier products. Ysello only permits automatic-delivery items
   whose supplier minimum quantity is compatible with the existing checkout.
4. Select products, choose the Ysello category, and import them as draft or
   explicitly publish them.
5. Use **Sync** to refresh supplier price and stock. Listings can be paused and
   re-enabled without losing their supplier mapping.

The global supplier markup is **30%** and is locked server-side. Supplier cost
and retail price remain separate. The code recalculates the 30% markup during
imports, scheduled sync, checkout validation, and final fulfillment; the buyer
cannot supply or override the price.

## Order safety

Ysello's normal payment flow completes first. For a Dark.shopping listing the
backend then refreshes product data, validates automatic delivery and stock,
checks supplier balance, and submits one idempotent supplier order. Pending
orders remain pending locally and are polled by the existing server job. A local
order is not treated as delivered until Dark.shopping reports completion and a
validated delivery file has been securely imported to protected inventory.

The delivery URL must use HTTPS and the `dark.shopping/storage/` host. Delivery
contents are never included in supplier logs or public/admin catalog payloads.

## Deployment

Set these only on the backend/API service:

```env
DARK_SHOPPING_API_KEY=YOUR_CURRENT_DARK_SHOPPING_KEY
DARK_SHOPPING_API_BASE_URL=https://dark.shopping/api/v1
DARK_SHOPPING_TIMEOUT_MS=15000
DARK_SHOPPING_MARGIN_PERCENT=30
DARK_SHOPPING_RUB_PER_USD=91.5
```

Run the normal Prisma deployment migration before starting the updated API:

```bash
npx prisma migrate deploy
```

The added migration changes existing Dark Shopping listing rows and their DB
default to the required 30% markup without resetting or deleting marketplace
tables.

## Activation checklist

A deployment should not be called live-verified until all of these have passed
against the production Dark.shopping account: Test connection/balance, category
load, product load/import, price/stock sync, and one legitimate end-to-end order
that reaches protected buyer delivery. Do not create unnecessary real supplier
orders merely as a test.

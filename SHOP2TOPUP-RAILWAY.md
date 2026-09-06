# SHOP2TOPUP production setup for Ysello

Verified against https://shop2topup.com/en/reseller-api on 2026-09-06.

## Railway API-service variables

```env
SHOP2TOPUP_API_KEY=<full keyId.secret credential>
SHOP2TOPUP_API_BASE_URL=https://shop2topup.com/api/endpoints/v1
SHOP2TOPUP_TIMEOUT_MS=15000
SHOP2TOPUP_MARGIN_PERCENT=20
SHOP2TOPUP_WEBHOOK_SECRET=<signing secret from SHOP2TOPUP Webhook Management>
SHOP2TOPUP_WEBHOOK_PUBLIC_URL=<exact public HTTPS webhook URL>
```

Do not add any SHOP2TOPUP secret to a `VITE_` variable or the Vercel browser environment.

## Webhook URL validation

This build intentionally treats SHOP2TOPUP's unsigned URL-reachability POST as a harmless validation probe and returns HTTP 200. Actual order outcome events (`order.completed`, `order.failed`, `order.refunded`) still require a valid `X-Shop2Topup-Signature` HMAC when they are processed.

Primary path:

```text
/api/webhooks/shop2topup
```

Compatibility alias:

```text
/api/shop2topup/webhook
```

Both paths also answer GET/HEAD with HTTP 200 for a simple reachability check.

If `api.ysello.com` is already attached to the Railway API service and publicly reachable, use:

```text
https://api.ysello.com/api/webhooks/shop2topup
```

If that custom API hostname is not yet publicly attached to the API service, use Railway's public HTTPS service URL instead and put the exact same URL in `SHOP2TOPUP_WEBHOOK_PUBLIC_URL`. For the Railway hostname previously used for this project, that would be:

```text
https://hsello-production.up.railway.app/api/webhooks/shop2topup
```

If the Railway public hostname has changed, replace the hostname above with the current value shown under Railway > service > Settings > Networking > Public Networking.

After SHOP2TOPUP saves/validates the URL and gives you a signing secret, set `SHOP2TOPUP_WEBHOOK_SECRET` in the same Railway API service and redeploy.

## Catalog import troubleshooting

SHOP2TOPUP can block catalog calls before Ysello receives any categories. The admin supplier panel now surfaces these provider states explicitly:

- `ACCOUNT_DISABLED`: SHOP2TOPUP must re-enable the reseller account.
- `ACCOUNT_FROZEN`: contact SHOP2TOPUP support.
- `IP_NOT_ALLOWED`: add Railway's outbound/egress IP to the API-key allowlist, or clear the supplier allowlist until static egress is configured.
- `INVALID_API_KEY`: rotate/re-copy the full `keyId.secret` credential.

The importer also has **Load all games/categories**, which calls `/catalog/categories` without a big-category filter. This means a missing/empty top-level group response no longer leaves the UI stuck at "Choose a group" when category data is otherwise available.

## Implemented SHOP2TOPUP v1 surface

- GET /account
- GET /catalog/big-categories
- GET /catalog/categories
- GET /catalog/subcategories
- GET /catalog/subcategory/:itemId/price
- GET /catalog/category/:categoryId/requirements
- POST /player/validate
- POST /orders/create
- GET /orders/:orderId
- POST /orders/batch
- GET /orders
- Signed order-status webhook receiver

Order creation uses the supplier's `order_id` idempotency model and supports `expected_unit_price` price protection. Persist the UUID before the first supplier create call, re-read the current supplier price immediately before ordering, and reconcile asynchronous completion through webhook/status reads.

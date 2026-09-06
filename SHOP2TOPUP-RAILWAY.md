# SHOP2TOPUP production setup for Ysello

Verified against https://shop2topup.com/en/reseller-api on 2026-09-06.

## Railway API-service variables

```env
SHOP2TOPUP_API_KEY=<keyId>.<secret>
SHOP2TOPUP_API_BASE_URL=https://shop2topup.com/api/endpoints/v1
SHOP2TOPUP_TIMEOUT_MS=15000
SHOP2TOPUP_MARGIN_PERCENT=20
SHOP2TOPUP_WEBHOOK_SECRET=<signing secret from SHOP2TOPUP Webhook Management>
```

Do not add any SHOP2TOPUP secret to a `VITE_` variable or the Vercel browser environment.

## SHOP2TOPUP portal settings

Webhook URL:

```text
https://api.ysello.com/api/webhooks/shop2topup
```

The endpoint is HTTPS, keeps the raw JSON body, verifies `X-Shop2Topup-Signature` as `sha256=<hex>` using HMAC-SHA256 when the webhook secret is configured, uses a timing-safe comparison, and acknowledges valid callbacks immediately with HTTP 200.

If you enable an API-key IP allowlist in SHOP2TOPUP, add the stable outbound/egress IP of the Railway API service. Do not put the public `api.ysello.com` address into the allowlist unless that is truly Railway's outbound IP; inbound domain/IP and outbound egress IP are different things. If Railway egress is not static, leave the SHOP2TOPUP allowlist empty until you configure static egress.

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

Order creation uses the supplier's `order_id` idempotency model and supports `expected_unit_price` price protection. The application should persist the UUID before the first supplier create call, re-read the current supplier price immediately before ordering, and reconcile asynchronous completion through the webhook/status endpoint rather than waiting for fulfillment inside the buyer request.

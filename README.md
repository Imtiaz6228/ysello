# Ysello digital marketplace

Ysello is a full-stack marketplace for reviewed digital downloads and service-based products. It includes secure authentication, seller approval, product moderation, cart and checkout, Stripe and PayPal hosted payment flows, manual payment approval, expiring downloads, invoices, support tickets, reviews, disputes, refunds, seller storefronts, legal pages, SEO metadata, sitemaps, reports, and an operations console.

The trust policy is enforced throughout the product: account and credential trading, hacking tools, stolen files, fake reviews, spam, and bot services are prohibited.

## Dark Shopping supplier API

The Express API includes an optional, server-side client for the documented
Dark Shopping v1 supplier API. The integration supports categories, groups,
attributes, product search and details, the top-products feed, account balance,
idempotent order creation, order status, and order download links.

Configure the integration only on Railway or another trusted API host:

```env
DARK_SHOPPING_API_KEY=YOUR_ROTATED_DARK_SHOPPING_API_KEY
DARK_SHOPPING_API_BASE_URL=https://dark.shopping/api/v1
DARK_SHOPPING_TIMEOUT_MS=15000
DARK_SHOPPING_MARGIN_PERCENT=15
DARK_SHOPPING_RUB_PER_USD=91.5
```

On Railway, add these values to the API service instance in the `production`
environment—the service that owns `api.ysello.com`. A Railway shared variable is
not injected merely because it exists: reference it from the API service as
`DARK_SHOPPING_API_KEY=${{shared.DARK_SHOPPING_API_KEY}}`, deploy the staged
change, and verify the new deployment rather than restarting an older one.

Dark Shopping also requires provider-side approval before a generated key can
use catalog or balance operations. Their published application criteria are a
site balance above zero and a linked, verified Telegram account. Submit the API
application from `https://dark.shopping/customer/settings/api`, choose resale
as the purpose, and include `https://ysello.com`. A provider `403` response
means the account has not been permitted to perform the API operation; it is not
an empty Ysello catalog.

Never expose the key through a `VITE_*` variable. The API key is sent from the
server using Dark Shopping's documented `key` parameter, responses are forced
to JSON, provider pagination links are scrubbed of credentials, and requests
are serialized to respect the provider's limit of two requests per second.

All integration routes require an authenticated `ADMIN` or `SUPER_ADMIN`
session:

| Method | Ysello route                                 | Dark Shopping operation                           |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| `GET`  | `/api/admin/dark-shopping/configuration`     | Safe configuration status (never returns the key) |
| `GET`  | `/api/admin/dark-shopping/categories`        | `category/list`                                   |
| `GET`  | `/api/admin/dark-shopping/groups`            | `group/list`                                      |
| `GET`  | `/api/admin/dark-shopping/attributes`        | `attribute/list`                                  |
| `GET`  | `/api/admin/dark-shopping/products`          | `product/list`                                    |
| `GET`  | `/api/admin/dark-shopping/products/top`      | `product/top`                                     |
| `GET`  | `/api/admin/dark-shopping/products/:id`      | `product/view`                                    |
| `GET`  | `/api/admin/dark-shopping/balance`           | `user/balance`                                    |
| `POST` | `/api/admin/dark-shopping/orders`            | `order/create`                                    |
| `GET`  | `/api/admin/dark-shopping/orders/:id/status` | `order/status`                                    |
| `GET`  | `/api/admin/dark-shopping/orders/:id`        | `order/download`                                  |

Resale management adds these protected operations:

| Method  | Ysello route                                             | Purpose                                        |
| ------- | -------------------------------------------------------- | ---------------------------------------------- |
| `GET`   | `/api/admin/dark-shopping/resale`                        | Listings, supplier balance, and fulfillment    |
| `POST`  | `/api/admin/dark-shopping/resale/import`                 | Import selected remote products                |
| `POST`  | `/api/admin/dark-shopping/resale/sync`                   | Refresh supplier prices and stock              |
| `PATCH` | `/api/admin/dark-shopping/resale/listings/:id`           | Change margin or pause/enable a listing        |
| `POST`  | `/api/admin/dark-shopping/resale/fulfillments/:id/retry` | Retry a failed or delayed supplier fulfillment |

Product-list query names follow the TypeScript-friendly forms `categoryId`,
`groupId`, `onlyInStock`, `onlyExclusive`, `deliveryType`, `minimumOrderFrom`,
`minimumOrderTo`, `priceFrom`, `priceTo`, `ratingFrom`, `ratingTo`,
`quantityFrom`, `quantityTo`, `page`, and `perPage`. `ids` accepts either a
comma-separated list or repeated values. `filterAttributes` accepts a JSON
array such as
`[{"id":3,"value":2,"filterType":"include"}]`. Product searches are sent to
the provider as POST JSON, matching the official client and avoiding long-URL
failures.

Creating an order spends the balance of the configured Dark Shopping account.
It therefore requires a caller-supplied `idempotenceId` (maximum 255 characters):

```json
{
  "productId": 1542,
  "quantity": 10,
  "promoCode": "OPTIONAL",
  "sendEmailCopy": false,
  "idempotenceId": "ysello-order-item-unique-id"
}
```

### Selecting products for resale

After deploying the migration, sign in as an administrator and open **Admin →
Marketplace → Dark Shopping resale**. The workflow is:

1. Select a Dark Shopping category or search by product name.
2. Review supplier cost, automatic/manual delivery, minimum order, stock, and
   quality information.
3. Select only the products you want to resell.
4. Choose the matching Ysello category.
5. Leave the margin at `15` or enter a different whole percentage.
6. Import as drafts for review, or explicitly select immediate publication.

Draft imports keep their supplier mapping disabled until an administrator
approves the product in **Product approvals**. Pausing a live resale listing
hides it from checkout without deleting its mapping or fulfillment history.

The RUB retail price is calculated as
`ceil(supplier price × (100 + margin) / 100)`. The 15% margin is therefore
applied before currency conversion and rounded upward so fractional kopecks do
not reduce it. USD and CNY prices use Ysello's existing storefront rates.
The margin is a supplier-cost markup and is separate from the marketplace's
configured commission accounting.

Set `DARK_SHOPPING_RUB_PER_USD` to the conservative RUB value received for one
USD after your real conversion costs. Review this deployment value regularly;
using an optimistic or stale rate can reduce the realized margin even though
the displayed RUB markup remains 15%.

Selected listing prices and stock synchronize every 15 minutes and again at
the start of every checkout. Automatic supplier products are purchased only
after Ysello confirms buyer payment. Checkout also verifies that the configured
Dark Shopping account has enough RUB balance for the supplier cost. Each
purchase uses the Ysello order-item ID
as Dark Shopping's `idempotence_id`, preventing duplicate supplier orders when
callbacks or retries overlap. Pending supplier orders are polled in the
background, and completed delivery files are downloaded only from the official
`dark.shopping/storage/` host and stored in the buyer's protected order
delivery.

If supplier price increases after checkout enough to reduce the configured
margin, automatic purchasing stops and the fulfillment is marked for admin
review instead of selling at a loss. The admin supplier workspace includes
listing synchronization, pause/enable controls, per-listing margin changes,
supplier balance, fulfillment status, and retry actions.

Dark Shopping contains categories that conflict with Ysello's
prohibited-products policy. The integration never mirrors the whole catalog,
rejects manual-delivery supplier products, and requires staff to review
legality, licensing, delivery, and policy compatibility before publication.

Apply the resale migration before using the workspace:

```sh
npm run prisma:migrate
```

## Wallet, top-ups, and seller settlement

The marketplace wallet keeps buyer funds and seller proceeds in separate
balances. A buyer creates a crypto top-up request, sends the exact requested
amount on the selected network, and submits both the complete TXID and a
screenshot containing that TXID. Proof files are private and visible only to
the submitting account and authorized staff. Funds remain pending until an
admin verifies the network, receiving address, amount, TXID, and screenshot.

| Asset | Network  | Receiving address                            |
| ----- | -------- | -------------------------------------------- |
| USDT  | TRC20    | `TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W`         |
| USDT  | BEP20    | `0x5fe0bc617b00812396560e00a47b68a4d19933df` |
| USDT  | ERC20    | `0x5fe0bc617b00812396560e00a47b68a4d19933df` |
| BTC   | Bitcoin  | `1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA`         |
| ETH   | Ethereum | `0x5fe0bc617b00812396560e00a47b68a4d19933df` |

Network and exchange fees are paid by the buyer. Wallet purchases debit the
buyer balance atomically. Each completed sale records a 10% platform commission
and freezes the seller's 90% net proceeds for 72 hours. Eligible proceeds move
to the seller's available balance once, even if release jobs overlap. A seller
withdrawal debits only available seller proceeds and stays pending until an
admin approves or rejects it; rejection restores the reserved amount.

Apply the committed Prisma migration before releasing this upgrade:

```sh
npm run prisma:migrate
```

One repository root, two deployment targets:

- **Railway** builds the React app and Express API, runs migrations, and serves everything from one origin.
- **Vercel** builds the React app. Its `/api` and `/uploads` rewrites proxy to Railway, so browser requests stay same-origin.
- **GitHub Actions** checks every pull request and `main` push against PostgreSQL before either platform deploys it.

There are no `frontend` or `backend` root folders and neither platform needs a Root Directory override.

## Railway

1. Create a Railway project from this GitHub repository and select the `main` branch.
2. Add a PostgreSQL service to the same Railway project.
3. On the app service, generate a public domain under **Settings → Networking**.
4. Leave **Root Directory** blank.
5. Railway reads `railway.json`; do not override its build, pre-deploy, start, or health-check commands.
6. Add the variables below and redeploy.

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://ysello.com
API_URL=https://api.ysello.com
CORS_ORIGIN=https://ysello.com,https://www.ysello.com
COOKIE_DOMAIN=
JWT_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
CSRF_SECRET=GENERATE_A_DIFFERENT_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_ROTATED_GOOGLE_WEB_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.ysello.com/auth/google/callback
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=30
SHORT_REFRESH_TOKEN_HOURS=24
# Optional email delivery. Registration and sign-in do not require SMTP.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
ADMIN_NOTIFICATION_EMAIL=
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_BYTES=8388608
TURNSTILE_REQUIRED=false
TURNSTILE_SECRET_KEY=

STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENVIRONMENT=sandbox
BANK_TRANSFER_INSTRUCTIONS="Bank and account details shown after order creation"
CRYPTO_PAYMENT_INSTRUCTIONS="Supported asset, network, and receiving address"
PRIVATE_UPLOAD_DIR=/app/private-uploads
MAX_PRODUCT_FILE_BYTES=104857600
TOPUP_TRC20_ADDRESS=TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W
TOPUP_BEP20_ADDRESS=0x5fe0bc617b00812396560e00a47b68a4d19933df
TOPUP_ERC20_ADDRESS=0x5fe0bc617b00812396560e00a47b68a4d19933df
TOPUP_BTC_ADDRESS=1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA
TOPUP_ETH_ADDRESS=0x5fe0bc617b00812396560e00a47b68a4d19933df
COMMISSION_SALE_PERCENT=10
COMMISSION_WITHDRAW_PERCENT=0
FROZEN_HOLD_HOURS=72
```

`COOKIE_DOMAIN` must remain blank. Keep `APP_URL=https://ysello.com`, `API_URL=https://api.ysello.com`, and `CORS_ORIGIN=https://ysello.com,https://www.ysello.com`. These values are required for browser authentication after the custom-domain move.

### Google sign-in

Create a **Web application** OAuth client in Google Cloud Console and configure
these exact production values:

- Authorized JavaScript origins: `https://ysello.com` and `https://www.ysello.com`
- Authorized redirect URI: `https://api.ysello.com/auth/google/callback`

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` on
Railway, then redeploy Railway and Vercel. The secret is backend-only: do not put
it in Vercel, source control, frontend code, or any `VITE_*` variable. Rotate the
secret immediately if it has ever been pasted into chat, logs, tickets, or a
public location. For local OAuth testing, separately authorize
`http://localhost:4000/auth/google/callback` and use that value in the local
environment.

Enter each Railway value as a single line without quotes or trailing whitespace.
An encoded `%0A` in Google's authorization URL means a copied variable contains
a newline; remove it and redeploy. The API trims these values defensively, but
the Railway variables should still be normalized at the source.

The callback uses authorization-code exchange with PKCE, a signed short-lived
HttpOnly state cookie, Google's verified account identifier, and Ysello's
existing rotating refresh-session cookies. A verified Google email can safely
link to an existing Ysello account with the same email. The API callback relays
the browser to the canonical Ysello callback before code exchange; this keeps
the host-only OAuth state and login cookies scoped to `ysello.com` while still
using Google's registered `api.ysello.com` redirect URI.

`API_URL` is the browser-reachable HTTPS origin of this API. Do not set it to a
PostgreSQL/TCP proxy URL, a `*.railway.internal` hostname, or a URL copied from
`DATABASE_URL`. If an invalid private or TCP value reaches the container, the
production environment loader now replaces it with Railway's
`RAILWAY_PUBLIC_DOMAIN`; when no Railway public domain is available, it safely falls back to
`https://api.ysello.com`.

Railway injects its own `PORT`; you do not need to create that variable. Before every release, `prisma migrate deploy` applies committed migrations to PostgreSQL. A failed migration stops the release before the new API starts.

The Railway pre-deploy step also checks for the known failed
`202607180001_commission_transaction_idempotency` attempt. When present, it
marks only that attempt as rolled back and immediately retries the repaired,
restart-safe migration. It does not reset the database. If duplicate historical
commission rows exist, the migration keeps the oldest live record and preserves
the other rows in `AdminTransactionDuplicateArchive` for audit before enforcing
the idempotency constraint.

Public images (product covers, store logo/banner, profile photos, and chat attachments) are saved to PostgreSQL and cached at `/app/uploads`, so a stateless redeploy no longer breaks newly uploaded media. A Railway volume at `/app/uploads` is still recommended for faster cache hits, but PostgreSQL is the durable source of truth.

Mount a second private volume at `/app/private-uploads` for seller delivery files and payment-proof screenshots. That directory is never exposed as static content; product files are released only through validated download grants, while payment proofs require the buyer's or an authorized staff member's session.

Stripe and PayPal are hidden by the API until their credentials are configured. Bank transfer and crypto are also hidden until instructions are configured. Manual approval remains available for staff-reviewed payments. Hosted provider returns are verified server-side before delivery, and provider refunds are issued through the matching API.

Railway can also host the complete app at its public URL. To start with that same-origin version, set `APP_URL`, `API_URL`, and `CORS_ORIGIN` to the Railway public origin. This is the simplest way to confirm registration and login before configuring Vercel.

## Vercel

1. Import the same repository and leave **Root Directory** blank.
2. Select `main` as the Production Branch.
3. Vercel reads `vercel.json`, proxies `/api`, `/uploads`, and the Google callback to Railway, and runs `npm run build:web`.
4. Keep the API rewrites pointed at `https://api.ysello.com`, then redeploy Vercel.

Set `VITE_SITE_URL=https://ysello.com`. The build prerenders unique titles, descriptions, canonical links, Open Graph tags, and Twitter tags for the home, catalog, blog, article, company, and legal routes. Vercel's generated production URL is used automatically for previews when the explicit value is absent.

Set any real webmaster verification tokens using the optional `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_BING_SITE_VERIFICATION`, `VITE_YANDEX_SITE_VERIFICATION`, and `VITE_BAIDU_SITE_VERIFICATION` variables. Empty variables produce no tag. Domain redirects, sitemap submission, and post-deployment indexing checks are documented in `SEO_DEPLOYMENT.md`.

Use `VITE_USE_REMOTE_API=false` for the normal Vercel setup so browser requests stay on `ysello.com` and use the included `/api` rewrite. `VITE_API_BASE_URL=https://api.ysello.com` remains available for an intentional direct-API deployment; do not append `/api`.

If Turnstile is enabled, also set `VITE_TURNSTILE_SITE_KEY` on Vercel and the matching `TURNSTILE_SECRET_KEY` on Railway. Add a Vercel preview URL to Railway's `CORS_ORIGIN` only when you intend to test that preview.

After deploying this update, redeploy Railway so the Ysello origin allowlist is active, then redeploy Vercel.

## GitHub autodeploy safety

Vercel and Railway automatically deploy new commits after their GitHub integrations are connected. In Railway's service settings, enable **Wait for CI** so releases start only after the included GitHub Actions workflow passes.

The workflow installs the locked dependencies, runs lint and tests, audits production dependencies, validates and migrates the Prisma schema on PostgreSQL 16, builds the frontend and API, and validates the Sites artifact. The included deploy workflow starts only after this verification workflow succeeds.

Choose one Railway deployment path explicitly:

- For GitHub Actions CLI deployment, add `RAILWAY_TOKEN` and
  `RAILWAY_SERVICE_ID` as secrets in the GitHub `production` environment.
- For Railway's native GitHub autodeploy, connect the API service to
  `Imtiaz6228/ysello` and select branch `main`. No Railway secret is required in
  GitHub for this mode; the workflow verifies Railway's exact-commit deployment
  status after CI succeeds.

The deployment workflow fails when CLI credentials are only partially
configured or when Railway's native integration does not report a successful
deployment for the exact commit. It must not show a green deployment while
silently skipping Railway. `railway.json` controls build and runtime settings
but cannot change the repository connected in the Railway dashboard.

## Staff accounts

Register the accounts first, then run these commands in the Railway service shell:

```sh
npm run set-role -- super@example.com SUPER_ADMIN
npm run set-role -- admin@example.com ADMIN
npm run set-role -- moderator@example.com MODERATOR
```

Moderators and admins can review seller applications. Super admins can also manage user roles.

## Local verification

Copy `.env.example` to `.env`, replace its placeholders with local values, and use a local PostgreSQL URL.

```sh
npm ci
npm run prisma:migrate
npm run build:railway
```

Use `npm run dev:api` for the API and `npm run dev:web` for Vite. The Vite development server proxies `/api` and `/uploads` to port 4000.

# Ysello digital marketplace

Ysello is a full-stack marketplace for reviewed digital downloads and service-based products. It includes secure authentication, seller approval, product moderation, cart and checkout, Stripe and PayPal hosted payment flows, manual payment approval, expiring downloads, invoices, support tickets, reviews, disputes, refunds, seller storefronts, legal pages, SEO metadata, sitemaps, reports, and an operations console.

The trust policy is enforced throughout the product: account and credential trading, hacking tools, stolen files, fake reviews, spam, and bot services are prohibited.

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
3. Vercel reads `vercel.json`, proxies `/api` and `/uploads` to Railway, and runs `npm run build:web`.
4. Keep the API rewrites pointed at `https://api.ysello.com`, then redeploy Vercel.

Set `VITE_SITE_URL=https://ysello.com`. The build prerenders unique titles, descriptions, canonical links, Open Graph tags, and Twitter tags for the home, catalog, blog, article, company, and legal routes. Vercel's generated production URL is used automatically for previews when the explicit value is absent.

Set any real webmaster verification tokens using the optional `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_BING_SITE_VERIFICATION`, `VITE_YANDEX_SITE_VERIFICATION`, and `VITE_BAIDU_SITE_VERIFICATION` variables. Empty variables produce no tag. Domain redirects, sitemap submission, and post-deployment indexing checks are documented in `SEO_DEPLOYMENT.md`.

Use `VITE_USE_REMOTE_API=false` for the normal Vercel setup so browser requests stay on `ysello.com` and use the included `/api` rewrite. `VITE_API_BASE_URL=https://api.ysello.com` remains available for an intentional direct-API deployment; do not append `/api`.

If Turnstile is enabled, also set `VITE_TURNSTILE_SITE_KEY` on Vercel and the matching `TURNSTILE_SECRET_KEY` on Railway. Add a Vercel preview URL to Railway's `CORS_ORIGIN` only when you intend to test that preview.

After deploying this update, redeploy Railway so the Ysello origin allowlist is active, then redeploy Vercel.

## GitHub autodeploy safety

Vercel and Railway automatically deploy new commits after their GitHub integrations are connected. In Railway's service settings, enable **Wait for CI** so releases start only after the included GitHub Actions workflow passes.

The workflow installs the locked dependencies, runs lint and tests, audits production dependencies, validates and migrates the Prisma schema on PostgreSQL 16, builds the frontend and API, and validates the Sites artifact. The included deploy workflow starts only after this verification workflow succeeds.

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

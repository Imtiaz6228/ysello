# Ysello deployment fix — 2026-09-07.4

This release fixes the `TS2304: Cannot find name locale` failure in `src/commerce/useMarketplace.ts` and includes the Telegram visitor notifier.

## Vercel
The Vercel project currently invokes `npm run build:web`. In this release that command intentionally prepares a lightweight proxy artifact and does not run the frontend TypeScript checker. The full application is served by Railway.

Expected Vercel build output includes:

```text
[ysello] Vercel proxy output prepared
```

## Railway
Railway uses `npm run build:railway`, which generates Prisma and builds the storefront with Vite without the separate TypeScript typecheck that previously blocked image creation.

Expected build marker:

```text
[ysello] building release 2026-09-07.4
```

Expected runtime marker:

```text
Ysello API 2026-09-07.4 listening on port ...
```

## Telegram
Set only on Railway:

```env
TELEGRAM_BOT_TOKEN=<new BotFather token>
TELEGRAM_CHAT_ID=<numeric Telegram chat id>
VISITOR_NOTIFY_ENABLED=true
VISITOR_NOTIFY_INCLUDE_BOTS=true
VISITOR_NOTIFY_DEDUPE_MINUTES=30
TELEGRAM_SUPPORT_FORWARDING_ENABLED=true
```

After deployment, use the authenticated admin endpoints:

- `GET /api/admin/telegram/status`
- `GET /api/admin/telegram/chats`
- `POST /api/admin/telegram/test`

A successful test sends a Telegram message to the configured numeric chat ID. Public HTML visits are then deduplicated by IP + user-agent and queued to Telegram after a successful response.

# Ysello Telegram admin hotfix — 2026-09-07.8

This release removes the need to test Telegram from the browser console.

- Admin → Support → Telegram visitor alerts now provides status, chat discovery, chat selection and one-click test messages.
- The selected supergroup `-1003862484719` is the project fallback destination. A Railway `TELEGRAM_CHAT_ID` overrides it.
- `GET /api/admin/telegram/test` is supported for an authenticated admin as a browser fallback.
- Public storefront sessions send a background `/api/visitor/notify` beacon so visitor alerts are not dependent on the HTML request reaching Railway through a CDN/proxy.
- The visitor beacon never contains the Telegram bot token; the token remains Railway-only.

Railway minimum configuration:

```env
TELEGRAM_BOT_TOKEN=<new BotFather token>
VISITOR_NOTIFY_ENABLED=true
VISITOR_NOTIFY_INCLUDE_BOTS=true
VISITOR_NOTIFY_DEDUPE_MINUTES=30
TELEGRAM_SUPPORT_FORWARDING_ENABLED=true
```

Recommended explicit destination:

```env
TELEGRAM_CHAT_ID=-1003862484719
```

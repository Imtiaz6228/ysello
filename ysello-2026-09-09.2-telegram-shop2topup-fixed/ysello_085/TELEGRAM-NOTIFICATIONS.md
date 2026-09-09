# Telegram visitor notifications — Ysello 2026-09-07.8

Ysello now has an admin-native Telegram setup and a browser visitor beacon. No browser console or manual POST request is needed.

## Railway variables

```env
TELEGRAM_BOT_TOKEN=<new BotFather token>
TELEGRAM_CHAT_ID=-1003862484719
VISITOR_NOTIFY_ENABLED=true
VISITOR_NOTIFY_INCLUDE_BOTS=true
VISITOR_NOTIFY_DEDUPE_MINUTES=30
TELEGRAM_SUPPORT_FORWARDING_ENABLED=true
```

`-1003862484719` is the selected supergroup **PvaPrime and Website Visitor Notify**. The project also uses it as a fallback when `TELEGRAM_CHAT_ID` is omitted, so only a valid bot token is strictly required for that destination. Railway environment variables override the fallback.

## Admin setup

1. Deploy Railway with `TELEGRAM_BOT_TOKEN`.
2. Sign in to Ysello as Admin/Super Admin.
3. Open **Admin → Support → Telegram visitor alerts**.
4. Click **Send test message**.
5. Click **Detect chats** to load recent Telegram chats.
6. Any detected group can be selected with **Use this chat**; Ysello immediately sends a confirmation message.
7. A browser-compatible authenticated test also exists at `/api/admin/telegram/test`.

## Visitor flow

The public React storefront sends a background POST to `/api/visitor/notify` once per browser session. Railway derives IP/country proxy headers, user agent, browser/device/OS, referrer, page, language, timezone and screen size, then sends the alert through Telegram Bot API. The same IP + user-agent fingerprint is deduplicated server-side for the configured number of minutes.

The bot token is never included in browser JavaScript.

## Security

If a bot token has ever been pasted into chat or another public/semi-public location, revoke it in BotFather and use the newly issued token in Railway.

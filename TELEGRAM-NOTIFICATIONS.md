# Ysello Telegram visitor + support notifications

This integration is server-side only. Never put the bot token in a `VITE_` variable or frontend source.

## Railway variables

```env
TELEGRAM_BOT_TOKEN=<full BotFather token>
TELEGRAM_CHAT_ID=<numeric destination chat id>
VISITOR_NOTIFY_ENABLED=true
VISITOR_NOTIFY_INCLUDE_BOTS=true
VISITOR_NOTIFY_DEDUPE_MINUTES=30
TELEGRAM_SUPPORT_FORWARDING_ENABLED=true
```

The visitor alert runs only after a successful public HTML response and is deduplicated by IP + user-agent fingerprint for the configured period. It reports the public page, referrer, IP, country/city headers when available, browser, OS, device class, language and a best-effort human/bot classification. User-Agent classification is not proof of a human or bot because clients can spoof it.

The existing Ysello support widget is also forwarded to the same numeric Telegram chat ID. Visitors do not need to know the Telegram chat ID and do not need a Telegram username to use the website chat.

## Find the numeric chat ID safely

1. Open the bot in Telegram and send `/start` (for a private admin chat), or add the bot to the admin group and send a message in that group.
2. Deploy Ysello with `TELEGRAM_BOT_TOKEN` set. `TELEGRAM_CHAT_ID` may be left blank while discovering the ID.
3. Sign in to Ysello as ADMIN/SUPER_ADMIN.
4. Open `/api/admin/telegram/chats` on the Ysello domain. The response lists recently seen Telegram chats with their numeric IDs.
5. Copy the desired `id` into Railway as `TELEGRAM_CHAT_ID`, redeploy, then visit the public storefront from an incognito window to trigger a test visitor alert.

Telegram `getUpdates` cannot be used while an outgoing Telegram webhook is configured for the bot. Ysello does not configure a Telegram webhook for this visitor-alert feature.

## Admin diagnostic endpoints

- `GET /api/admin/telegram/status` — checks Bot API authentication without exposing the token.
- `GET /api/admin/telegram/chats` — lists chat IDs found in recent bot updates.
- `POST /api/admin/telegram/test` — sends a test message to the configured destination.

## Important distinction

A numeric Telegram `chat_id` is an internal Bot API routing identifier, not a public contact URL. Ysello uses it as the private destination for visitor notifications and website support messages. If visitors should message the bot directly inside Telegram, Telegram still requires the bot's public `t.me/<bot_username>` deep link.

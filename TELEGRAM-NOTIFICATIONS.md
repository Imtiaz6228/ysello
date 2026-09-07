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

## Numeric chat ID — exact setup sequence

1. Rotate the BotFather token if it has been shared anywhere outside Railway.
2. Open `@VisitorNotify786_bot` in Telegram and press **Start** (or send `/start`).
3. In Railway, set `TELEGRAM_BOT_TOKEN` to the new token and temporarily leave `TELEGRAM_CHAT_ID` empty.
4. Deploy the API.
5. Sign in to Ysello as an ADMIN/SUPER_ADMIN and request `GET /api/admin/telegram/chats` on the API origin. The response lists recent Telegram conversations received by the bot.
6. Copy the numeric `id` for your private chat and set it in Railway as `TELEGRAM_CHAT_ID`.
7. Redeploy, then call `POST /api/admin/telegram/test`. A success message should arrive in that Telegram conversation.
8. Open a public Ysello page from another browser/device to verify the visitor alert.

Private chat IDs are normally positive integers. Group/supergroup IDs are normally negative. A numeric `chat_id` is an internal Bot API destination; it is not a public URL or username. The Ysello support widget can forward visitors' messages to this chat ID so site visitors do not need to know your Telegram account.

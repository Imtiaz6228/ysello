# Ysello Railway OpenSSL + Telegram setup

Release: 2026-09-07.5

## Railway OpenSSL variables

Add these as SERVICE variables on the Ysello Railway API service:

```env
RAILPACK_BUILD_APT_PACKAGES=... openssl
RAILPACK_DEPLOY_APT_PACKAGES=... openssl
```

The leading `...` preserves Railpack's automatically selected APT packages and adds OpenSSL.
The repository also contains `railpack.json` with the same build/runtime OpenSSL requirement and Prisma is generated with `debian-openssl-3.0.x` as an explicit deployment target.

The pre-deploy command now begins with `openssl version` before running migration recovery and `prisma migrate deploy`, making the runtime dependency visible in the deployment log.

## Telegram numeric chat ID

1. Regenerate the bot token in BotFather because the original token was shared in chat.
2. Open `@VisitorNotify786_bot` in Telegram and press Start or send `/start`.
3. Put the new token in Railway as `TELEGRAM_BOT_TOKEN`. Leave `TELEGRAM_CHAT_ID` blank for the first deployment.
4. Deploy release 2026-09-07.5.
5. Sign in to Ysello as an admin and open `/api/admin/telegram/chats`.
6. Find your private chat and copy its numeric `id`, for example `123456789`.
7. Add `TELEGRAM_CHAT_ID=123456789` in Railway and redeploy.
8. Open `/api/admin/telegram/test` with POST from the admin UI/API client, or visit the storefront from another browser/device.

A private user chat ID is normally a positive integer. Telegram groups/supergroups normally use a negative integer. The numeric chat ID is an internal Bot API destination and is not a public Telegram URL. Website users can use Ysello's support widget; Ysello forwards those messages to the configured numeric Telegram chat ID.

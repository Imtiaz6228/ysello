# Ysello order & top-up Telegram notifications · 2026-09-08.3

This release adds a second Telegram bot path dedicated to orders and wallet top-ups.

Railway variables (backend service only):

```env
ORDER_TELEGRAM_BOT_TOKEN=YOUR_CURRENT_BOTFATHER_TOKEN
ORDER_TELEGRAM_CHAT_ID=-1003862484719
ORDER_TELEGRAM_NOTIFICATIONS_ENABLED=true
```

The same supergroup chat ID used by the visitor bot can be reused because a Telegram chat ID identifies the chat, not the bot. Add `@YselloOrders787_bot` to that supergroup and allow it to send messages and media/photos.

Admin diagnostics (must be signed in as Admin/Super Admin):

- `GET /api/admin/order-telegram/status`
- `GET /api/admin/order-telegram/test`
- `POST /api/admin/order-telegram/test`

Notifications:

1. Order created/paid: order number, payment state/method, total, buyer name/email/Telegram/phone, country/IP, all product/package names, each quantity and total quantity.
2. Wallet top-up created: reference, buyer/contact, country/IP, amount, estimated fee, total payable, network and deposit address.
3. Top-up proof submitted: buyer/contact, amount, network, TXID, proof time plus the stored payment screenshot sent as a Telegram photo.

The bot token never goes into Vite or browser code.

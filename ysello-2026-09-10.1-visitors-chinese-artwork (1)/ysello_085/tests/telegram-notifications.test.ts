import test from "node:test";
import assert from "node:assert/strict";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "j".repeat(40);
process.env.CSRF_SECRET = "c".repeat(40);
process.env.APP_URL = "https://ysello.com";
process.env.API_URL = "https://api.ysello.com";
process.env.TELEGRAM_BOT_TOKEN = "123456:" + "a".repeat(30);
process.env.VISITOR_NOTIFY_INCLUDE_BOTS = "true";
delete process.env.ORDER_TELEGRAM_BOT_TOKEN;
delete process.env.ORDER_TELEGRAM_CHAT_ID;
const visitor = await import("../src/services/telegram-notify.service.js");
const orders = await import("../src/services/order-telegram.service.js");
const prismaModule = await import("../src/lib/prisma.js");
let calls: Array<{ url: string; body: any }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url: String(url), body: init?.body });
  return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
};
const humanUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36";
function request(ua = humanUa, ip = "127.0.0.1") {
  const headers: Record<string, string> = { "user-agent": ua, origin: "https://ysello.com", "sec-fetch-site": "same-origin" };
  return { headers, ip, get: (name: string) => headers[name], method: "POST", path: "/api/visitor/notify" } as any;
}
const savedNow = Date.now;
Date.now = () => savedNow() - 40000;
const sessionToken = visitor.createVisitorSession(request());
Date.now = savedNow;
const engaged = { sessionToken, page: "https://ysello.com/catalog", dwellSeconds: 40, visibilitySeconds: 35, interactions: 2 };
test("visitor filter blocks crawlers even with legacy include-bots enabled", async () => {
  for (const ua of ["Googlebot", humanUa + " GPTBot", "curl/8", "", humanUa + " HeadlessChrome"]) {
    assert.equal(await visitor.queueVisitorTelegramBeacon(request(ua), engaged), false);
  }
  assert.equal(visitor.queueVisitorTelegramNotification(request()), false);
  assert.equal(calls.length, 0);
});
test("visitor must show visible time and a public page", async () => {
  for (const patch of [{ dwellSeconds: 20 }, { visibilitySeconds: 0 }, { visibilitySeconds: undefined }, { page: "https://ysello.com/admin" }, { page: "https://ysello.com/brand-icons/gmail.svg" }, { page: "https://example.com/" }]) {
    assert.equal(await visitor.queueVisitorTelegramBeacon(request(), { ...engaged, ...patch }), false);
  }
  assert.equal(calls.length, 0);
});
test("concurrent human beacons send once and completed duplicates are acknowledged", async () => {
  const req = request();
  await Promise.all([visitor.queueVisitorTelegramBeacon(req, engaged), visitor.queueVisitorTelegramBeacon(req, engaged)]);
  assert.equal(calls.length, 1);
  assert.equal(await visitor.queueVisitorTelegramBeacon(req, engaged), true);
  assert.equal(calls.length, 1);
});
test("orders and top-ups use the main bot and selected chat when no dedicated bot is set", async () => {
  visitor.setTelegramRuntimeChatId("-123456");
  assert.equal(orders.orderTelegramChatId(), "-123456");
  const result = await orders.sendOrderTelegramMessage("Order test");
  assert.equal(result.sent, true);
  assert.equal(JSON.parse(calls.at(-1)!.body).chat_id, "-123456");
  assert.ok(calls.at(-1)!.url.includes(process.env.TELEGRAM_BOT_TOKEN!));
});
test("top-up approval alert includes credited amount and wallet balance", async () => {
  const original = prismaModule.prisma.topupRequest.findUnique;
  prismaModule.prisma.topupRequest.findUnique = (async () => ({
    status: "APPROVED", reference: "TEST-1", amountCents: 1000,
    method: "CRYPTO_TRC20", txHash: "test-tx", adminNotes: null,
    user: { username: "testbuyer", email: "test@example.com", balanceCents: 1500 },
  })) as any;
  try {
    await orders.queueTopupReviewedTelegram("test");
    const text = JSON.parse(calls.at(-1)!.body).text;
    assert.match(text, /APPROVED AND CREDITED/);
    assert.match(text, /\$10.00/);
    assert.match(text, /\$15.00/);
  } finally { prismaModule.prisma.topupRequest.findUnique = original; }
});
test("passive reader qualifies at 35 seconds and a changed IP does not invalidate the session", async () => {
  const req = request(humanUa, "::1");
  const before = calls.length;
  assert.equal(await visitor.queueVisitorTelegramBeacon(req, { ...engaged, dwellSeconds: 35, visibilitySeconds: 35, interactions: 0 }), true);
  assert.equal(calls.length, before + 1);
});
test("created top-ups send immediately without visitor engagement checks", async () => {
  const original = prismaModule.prisma.topupRequest.findUnique;
  prismaModule.prisma.topupRequest.findUnique = (async () => ({
    reference: "NEW-TOPUP", amountCents: 1000, networkFeeCents: 100, totalPayableCents: 1100,
    method: "CRYPTO_TRC20", depositAddress: "test-address", createdAt: new Date(),
    user: { firstName: "Test", lastName: "Buyer", username: "buyer", email: "test@example.com", country: "Pakistan" },
  })) as any;
  const before = calls.length;
  try {
    await orders.queueTopupCreatedTelegram({ topupId: "test", req: request(), telegramContact: "testbuyer" });
    assert.equal(calls.length, before + 1);
    assert.match(JSON.parse(calls.at(-1)!.body).text, /@testbuyer/);
    assert.match(JSON.parse(calls.at(-1)!.body).text, /NEW YSELLO WALLET TOP-UP/);
  } finally { prismaModule.prisma.topupRequest.findUnique = original; }
});
test("saved orders send package and amount immediately without a visitor session", async () => {
  const original = prismaModule.prisma.order.findUnique;
  prismaModule.prisma.order.findUnique = (async () => ({
    id: "order-test", orderNumber: "YS-TEST", status: "PAID", currency: "USD", totalCents: 4500, createdAt: new Date(),
    buyer: { firstName: "Test", lastName: "Buyer", username: "buyer", email: "test@example.com", country: "Pakistan" },
    payment: { method: "WALLET", status: "PAID" },
    items: [{ productName: "Instagram 100 Accounts", quantity: 1, totalCents: 4500,
      product: { name: "Instagram 100 Accounts", category: { name: "Instagram" } } }],
  })) as any;
  const before = calls.length;
  try {
    await orders.queueOrderCreatedTelegram({ orderId: "order-test", req: request(), telegramContact: "buyer" });
    assert.equal(calls.length, before + 1);
    const text = JSON.parse(calls.at(-1)!.body).text;
    assert.match(text, /Instagram 100 Accounts/);
    assert.match(text, /Total accounts: 100/);
    assert.match(text, /\$45.00/);
  } finally { prismaModule.prisma.order.findUnique = original; }
});
test.after(() => { globalThis.fetch = originalFetch; });

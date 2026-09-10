import type { Request } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

import { telegramDestinationChatId } from "./telegram-notify.service.js";
const geoCache = new Map<string, { country?: string; countryCode?: string; city?: string; expiresAt: number }>();

type RequestContext = {
  ip: string;
  country: string;
  city: string;
  userAgent: string;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestIp(req: Request) {
  const forwarded = firstHeader(req.headers["x-forwarded-for"]);
  const value = forwarded?.split(",")[0]?.trim() || firstHeader(req.headers["x-real-ip"]) || req.ip || "Unknown";
  return value.replace(/^::ffff:/, "");
}

function publicIp(ip: string) {
  if (!ip || ip === "Unknown" || ip === "127.0.0.1" || ip === "::1") return false;
  if (/^10\.|^192\.168\.|^169\.254\./.test(ip)) return false;
  const match = ip.match(/^172\.(\d+)\./);
  return !(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function regionName(code: string) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

async function geoIp(ip: string) {
  if (!publicIp(ip)) return {} as { country?: string; countryCode?: string; city?: string };
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city`, { signal: controller.signal });
    const data = await response.json().catch(() => null) as null | {
      success?: boolean;
      country?: string;
      country_code?: string;
      city?: string;
    };
    const result = response.ok && data?.success !== false
      ? { country: data?.country, countryCode: data?.country_code?.toUpperCase(), city: data?.city }
      : {};
    geoCache.set(ip, { ...result, expiresAt: Date.now() + 6 * 60 * 60_000 });
    if (geoCache.size > 3000) geoCache.clear();
    return result;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function contextFromRequest(req: Request, accountCountry?: string | null, accountCity?: string | null): Promise<RequestContext> {
  const ip = requestIp(req);
  const headerCode = (
    firstHeader(req.headers["x-vercel-ip-country"]) ||
    firstHeader(req.headers["cf-ipcountry"]) ||
    firstHeader(req.headers["x-country-code"]) ||
    ""
  ).toUpperCase();
  const headerCity = firstHeader(req.headers["x-vercel-ip-city"]) || firstHeader(req.headers["x-city"]) || "";
  const lookup = !headerCode && !accountCountry ? await geoIp(ip) : {};
  const country = accountCountry || lookup.country || regionName(headerCode || lookup.countryCode || "") || "Unknown";
  const city = accountCity || headerCity || lookup.city || "";
  return { ip, country, city, userAgent: req.get("user-agent") || "Unknown" };
}

function money(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function normalizeTelegram(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return "Not provided";
  if (/^https?:\/\/(?:t\.me|telegram\.me)\//i.test(raw)) return raw;
  const cleaned = raw.replace(/^@+/, "");
  return cleaned ? `@${cleaned}` : "Not provided";
}

function token() {
  return env.ORDER_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
}

export function orderTelegramChatId() {
  return env.ORDER_TELEGRAM_CHAT_ID || telegramDestinationChatId();
}

async function telegramCall(method: string, body: BodyInit, contentType?: string) {
  if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) {
    return { sent: false as const, reason: "not-configured" as const };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers = contentType ? { "content-type": contentType } : undefined;
    const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null) as null | { ok?: boolean; description?: string; result?: unknown };
    if (!response.ok || data?.ok !== true) {
      throw new Error(data?.description || `Telegram returned HTTP ${response.status}`);
    }
    return { sent: true as const, result: data.result };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOrderTelegramMessage(text: string) {
  return telegramCall(
    "sendMessage",
    JSON.stringify({
      chat_id: orderTelegramChatId(),
      text: text.slice(0, 4096),
      disable_web_page_preview: true,
    }),
    "application/json",
  );
}

export async function sendOrderTelegramPhoto(data: Uint8Array, mimeType: string, fileName: string, caption: string) {
  if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) return { sent: false as const, reason: "not-configured" as const };
  const form = new FormData();
  form.set("chat_id", orderTelegramChatId());
  form.set("caption", caption.slice(0, 1024));
  form.set("photo", new Blob([new Uint8Array(data)], { type: mimeType || "image/jpeg" }), fileName);
  return telegramCall("sendPhoto", form);
}

export async function orderTelegramStatus() {
  const chatId = orderTelegramChatId();
  if (!token()) {
    return { configured: false as const, enabled: env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED, chatConfigured: Boolean(chatId), chatId };
  }
  try {
    const [botResponse, chatResponse] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token()}/getMe`),
      fetch(`https://api.telegram.org/bot${token()}/getChat?chat_id=${encodeURIComponent(chatId)}`),
    ]);
    const bot = await botResponse.json().catch(() => null) as any;
    const chat = await chatResponse.json().catch(() => null) as any;
    return {
      configured: Boolean(botResponse.ok && bot?.ok),
      enabled: env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED,
      chatConfigured: Boolean(chatId),
      chatId,
      destinationReachable: Boolean(chatResponse.ok && chat?.ok),
      bot: bot?.result ?? null,
      chat: chat?.result ?? null,
      error: !botResponse.ok || !bot?.ok ? bot?.description : !chatResponse.ok || !chat?.ok ? chat?.description : undefined,
    };
  } catch (error) {
    return {
      configured: false as const,
      enabled: env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED,
      chatConfigured: Boolean(chatId),
      chatId,
      destinationReachable: false,
      error: error instanceof Error ? error.message : "Could not reach Telegram Bot API.",
    };
  }
}


function integerFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string" && /^\d{1,7}$/.test(value.trim())) return Number(value.trim());
  return 0;
}

function accountsPerPackage(product: {
  name: string;
  shortDescription?: string | null;
  tags?: string[];
  productAttributes?: unknown;
}) {
  const attrs = product.productAttributes && typeof product.productAttributes === "object"
    ? product.productAttributes as Record<string, unknown>
    : {};
  for (const key of ["accountCount", "accounts", "packageSize", "quantity", "units", "qty", "profiles"]) {
    const parsed = integerFromUnknown(attrs[key]);
    if (parsed > 0) return parsed;
  }
  const haystack = [product.name, product.shortDescription ?? "", ...(product.tags ?? [])].join(" ");
  const matches = [...haystack.matchAll(/\b(\d{1,7})\s*(?:x\s*)?(accounts?|accs?|profiles?|pcs?|pieces?|units?)\b/gi)];
  if (matches.length) return Math.max(...matches.map((match) => Number(match[1]) || 0));
  if (/accounts?|accs?|profiles?/i.test(haystack)) {
    const candidates = [...haystack.matchAll(/\b(\d{1,7})\b/g)]
      .map((match) => Number(match[1]) || 0)
      .filter((value) => value > 2 && !(value >= 1990 && value <= 2035));
    if (candidates.length) return Math.max(...candidates);
  }
  return 0;
}

export function queueOrderCreatedTelegram(input: { orderId: string; req: Request; telegramContact?: string | null; event?: string }) {
  return (async () => {
    if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) return;
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true, username: true, phone: true, country: true, city: true } },
        payment: true,
        items: { include: { product: { select: {
          slug: true,
          name: true,
          shortDescription: true,
          tags: true,
          productAttributes: true,
          category: { select: { name: true } },
        } } } },
      },
    });
    if (!order) return;
    const ctx = await contextFromRequest(input.req, order.buyer.country, order.buyer.city);
    let totalAccounts = 0;
    const items = order.items.flatMap((item, index) => {
      const perPackage = accountsPerPackage(item.product);
      const accountTotal = perPackage > 0 ? perPackage * item.quantity : 0;
      totalAccounts += accountTotal;
      return [
        `${index + 1}. ${item.productName}`,
        `   Package quantity: ${item.quantity}`,
        perPackage > 0 ? `   Accounts per package: ${perPackage.toLocaleString()}` : null,
        accountTotal > 0 ? `   Total accounts: ${accountTotal.toLocaleString()}` : null,
        `   Amount: ${money(item.totalCents, order.currency)}`,
        item.product.category?.name ? `   Category: ${item.product.category.name}` : null,
      ].filter((line): line is string => Boolean(line));
    });
    const providerPayload = order.payment?.providerPayload && typeof order.payment.providerPayload === "object"
      ? order.payment.providerPayload as Record<string, unknown>
      : null;
    const savedTelegram = typeof providerPayload?.buyerTelegram === "string" ? providerPayload.buyerTelegram : null;
    const txHash = typeof providerPayload?.txHash === "string" ? providerPayload.txHash : null;
    const message = [
      input.event || "🛒 NEW YSELLO ORDER",
      `Order: ${order.orderNumber}`,
      `Status: ${order.status.replaceAll("_", " ")}`,
      `Payment: ${order.payment?.method?.replaceAll("_", " ") ?? "Unknown"} · ${order.payment?.status?.replaceAll("_", " ") ?? "Unknown"}`,
      `Amount: ${money(order.totalCents, order.currency)}`,
      order.payment?.providerReference ? `Payment reference: ${order.payment.providerReference}` : null,
      `TXID: ${txHash || "Waiting / not applicable"}`,
      `Buyer: ${order.buyer.firstName} ${order.buyer.lastName} (@${order.buyer.username})`,
      `Email: ${order.buyer.email}`,
      `Telegram: ${normalizeTelegram(input.telegramContact || savedTelegram)}`,
      order.buyer.phone ? `Phone: ${order.buyer.phone}` : null,
      `Country: ${ctx.country}${ctx.city ? ` · ${ctx.city}` : ""}`,
      `IP: ${ctx.ip}`,
      "",
      "Products / packages:",
      ...items,
      "",
      `Total package quantity: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`,
      totalAccounts > 0 ? `Total accounts: ${totalAccounts.toLocaleString()}` : null,
      `Created: ${order.createdAt.toISOString()}`,
      `Order ID: ${order.id}`,
    ].filter((line): line is string => line !== null).join("\n");
    await sendOrderTelegramMessage(message);
  })().catch((error) => console.warn("Order Telegram notification failed:", error instanceof Error ? error.message : error));
}

export function queueTopupCreatedTelegram(input: { topupId: string; req: Request; telegramContact?: string | null }) {
  return (async () => {
    if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) return;
    const topup = await prisma.topupRequest.findUnique({
      where: { id: input.topupId },
      include: { user: { select: { firstName: true, lastName: true, username: true, email: true, phone: true, country: true, city: true } } },
    });
    if (!topup) return;
    const ctx = await contextFromRequest(input.req, topup.user.country, topup.user.city);
    await sendOrderTelegramMessage([
      "💰 NEW YSELLO WALLET TOP-UP",
      `Reference: ${topup.reference}`,
      `Telegram: ${normalizeTelegram(input.telegramContact)}`,
      `Buyer: ${topup.user.firstName} ${topup.user.lastName} (@${topup.user.username})`,
      `Email: ${topup.user.email}`,
      topup.user.phone ? `Phone: ${topup.user.phone}` : null,
      `Country: ${ctx.country}${ctx.city ? ` · ${ctx.city}` : ""}`,
      `IP: ${ctx.ip}`,
      `Wallet credit: ${money(topup.amountCents)}`,
      `Ysello processing/network allowance: ${money(topup.networkFeeCents)}`,
      `SEND EXACTLY: ${money(topup.totalPayableCents)}`,
      `Network: ${topup.method.replaceAll("_", " ")}`,
      `Deposit address: ${topup.depositAddress}`,
      "TXID: Waiting for buyer proof",
      "Screenshot: Waiting for buyer proof",
      `Created: ${topup.createdAt.toISOString()}`,
    ].filter((line): line is string => line !== null).join("\n"));
  })().catch((error) => console.warn("Top-up Telegram notification failed:", error instanceof Error ? error.message : error));
}

export function queueTopupProofTelegram(input: { topupId: string; req: Request; telegramContact?: string | null }) {
  return (async () => {
    if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) return;
    const topup = await prisma.topupRequest.findUnique({
      where: { id: input.topupId },
      include: { user: { select: { firstName: true, lastName: true, username: true, email: true, phone: true, country: true, city: true } } },
    });
    if (!topup) return;
    const ctx = await contextFromRequest(input.req, topup.user.country, topup.user.city);
    const text = [
      "🧾 TOP-UP PAYMENT PROOF SUBMITTED",
      `Reference: ${topup.reference}`,
      `Telegram: ${normalizeTelegram(input.telegramContact)}`,
      `Status: ${topup.status.replaceAll("_", " ")}`,
      `Buyer: ${topup.user.firstName} ${topup.user.lastName} (@${topup.user.username})`,
      `Email: ${topup.user.email}`,
      topup.user.phone ? `Phone: ${topup.user.phone}` : null,
      `Country: ${ctx.country}${ctx.city ? ` · ${ctx.city}` : ""}`,
      `IP: ${ctx.ip}`,
      `Amount: ${money(topup.amountCents)}`,
      `SEND EXACTLY: ${money(topup.totalPayableCents)}`,
      `Network: ${topup.method.replaceAll("_", " ")}`,
      `TXID: ${topup.txHash || "Not provided"}`,
      `Proof submitted: ${topup.proofSubmittedAt?.toISOString() ?? new Date().toISOString()}`,
    ].filter((line): line is string => line !== null).join("\n");
    await sendOrderTelegramMessage(text);
    if (topup.screenshotData) {
      await sendOrderTelegramPhoto(
        new Uint8Array(topup.screenshotData),
        topup.screenshotMimeType || "image/jpeg",
        `topup-${topup.reference}.${(topup.screenshotMimeType || "image/jpeg").includes("png") ? "png" : "jpg"}`,
        `Payment screenshot · ${topup.reference}\nTXID: ${topup.txHash || "Not provided"}\nAmount: ${money(topup.totalPayableCents)}`,
      );
    }
  })().catch((error) => console.warn("Top-up proof Telegram notification failed:", error instanceof Error ? error.message : error));
}

// Called only after the admin transaction commits; delivery never changes balance.
export function queueTopupReviewedTelegram(topupId: string) {
  return (async () => {
    if (!env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED || !token()) return;
    const topup = await prisma.topupRequest.findUnique({
      where: { id: topupId },
      include: { user: { select: { username: true, email: true, balanceCents: true } } },
    });
    if (!topup || !["APPROVED", "REJECTED"].includes(topup.status)) return;
    await sendOrderTelegramMessage([
      topup.status === "APPROVED" ? "✅ YSELLO TOP-UP APPROVED AND CREDITED" : "❌ YSELLO TOP-UP REJECTED",
      `Reference: ${topup.reference}`,
      `Buyer: @${topup.user.username}`,
      `Email: ${topup.user.email}`,
      `Amount: ${money(topup.amountCents)}`,
      `Wallet balance: ${money(topup.user.balanceCents)}`,
      `Network: ${topup.method.replaceAll("_", " ")}`,
      `TXID: ${topup.txHash || "Not provided"}`,
      `Admin notes: ${topup.adminNotes || "None"}`,
    ].join("\n"));
  })().catch((error) => console.warn("Top-up review Telegram notification failed:", error instanceof Error ? error.message : error));
}

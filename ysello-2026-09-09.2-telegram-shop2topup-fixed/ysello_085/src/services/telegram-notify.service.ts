import { issueVisitorSession, validVisitorSession } from "./visitor-session.js";
import type { Request } from "express";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

// This project already selected this supergroup through Telegram getUpdates.
// A Railway TELEGRAM_CHAT_ID always overrides this project fallback.
const PROJECT_DEFAULT_CHAT_ID = "-1003862484719";
let runtimeChatId: string | null = null;
const dedupe = new Map<string, number>();
const pendingVisitors = new Set<string>();

type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type VisitorClientContext = {
  sessionToken?: string;
  page?: string;
  referrer?: string;
  language?: string;
  timezone?: string;
  screen?: string;
  dwellSeconds?: number;
  pagesViewed?: number;
  interactions?: number;
  visibilitySeconds?: number;
};

type GeoRecord = { countryCode?: string; country?: string; city?: string };
const geoCache = new Map<string, { value: GeoRecord; expiresAt: number }>();

function cleanHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstForwardedIp(req: Request) {
  const forwarded = cleanHeader(req.headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.replace(/^::ffff:/, "");
  }
  const realIp = cleanHeader(req.headers["x-real-ip"]);
  if (realIp) return realIp.replace(/^::ffff:/, "");
  return req.ip?.replace(/^::ffff:/, "") || "Unknown";
}

function countryCode(req: Request) {
  return (
    cleanHeader(req.headers["x-vercel-ip-country"]) ||
    cleanHeader(req.headers["cf-ipcountry"]) ||
    cleanHeader(req.headers["x-country-code"]) ||
    ""
  ).toUpperCase();
}

function countryLabel(code: string) {
  if (!code) return "Unknown";
  try {
    return `${new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code} (${code})`;
  } catch {
    return code;
  }
}

function isPublicIp(ip: string) {
  if (!ip || ip === "Unknown" || ip === "127.0.0.1" || ip === "::1") return false;
  if (/^10\.|^192\.168\.|^169\.254\./.test(ip)) return false;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
  return true;
}

async function geoFromIp(ip: string): Promise<GeoRecord> {
  if (!isPublicIp(ip)) return {};
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city`, { signal: controller.signal });
    const data = await response.json().catch(() => null) as null | { success?: boolean; country?: string; country_code?: string; city?: string };
    const value: GeoRecord = response.ok && data?.success !== false ? {
      countryCode: data?.country_code?.toUpperCase(),
      country: data?.country,
      city: data?.city,
    } : {};
    geoCache.set(ip, { value, expiresAt: Date.now() + 6 * 60 * 60_000 });
    if (geoCache.size > 5000) {
      const oldest = geoCache.keys().next().value;
      if (oldest) geoCache.delete(oldest);
    }
    return value;
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function searchEngineFromReferrer(referrer: string) {
  if (!referrer || referrer === "Direct / none") return "Direct / none";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google.")) return "Google";
    if (host.includes("bing.com")) return "Bing";
    if (host.includes("yandex.")) return "Yandex";
    if (host.includes("baidu.com")) return "Baidu";
    if (host.includes("duckduckgo.com")) return "DuckDuckGo";
    if (host.includes("yahoo.")) return "Yahoo";
    if (host.includes("chatgpt.com") || host.includes("openai.com")) return "ChatGPT / OpenAI";
    if (host.includes("perplexity.ai")) return "Perplexity";
    return host.replace(/^www\./, "");
  } catch {
    return "Other / unknown";
  }
}

function browserFromUa(ua: string) {
  if (/edg\//i.test(ua)) return "Microsoft Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/samsungbrowser\//i.test(ua)) return "Samsung Internet";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/crios\//i.test(ua)) return "Chrome iOS";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/fxios\//i.test(ua)) return "Firefox iOS";
  if (/safari\//i.test(ua) && /version\//i.test(ua)) return "Safari";
  return ua ? "Other / unknown" : "Unknown";
}

function osFromUa(ua: string) {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS / iPadOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

const BOT_UA = /bot\b|crawler|spider|slurp|bingpreview|google(?:bot|other)|adsbot|mediapartners|duckduckbot|baiduspider|yandex(?:bot|images)|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|applebot|semrushbot|ahrefsbot|mj12bot|bytespider|gptbot|oai-searchbot|chatgpt-user|claude(?:bot|-searchbot|-user)|perplexity(?:bot|-user)|uptimerobot|headlesschrome|lighthouse|curl|wget|python|httpclient|axios|node-fetch|undici|playwright|puppeteer|selenium|phantomjs|monitor|scanner/i;

function visitorType(ua: string) {
  if (BOT_UA.test(ua)) return "Bot / crawler";
  if (!ua) return "Unknown";
  return "Likely human";
}

function deviceFromUa(ua: string) {
  if (BOT_UA.test(ua)) return "Automated client";
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android/i.test(ua)) return "Mobile";
  return "Desktop";
}

function cityLabel(req: Request) {
  const raw = cleanHeader(req.headers["x-vercel-ip-city"]);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function shouldNotifyPath(req: Request) {
  if (req.method !== "GET") return false;
  if (!req.accepts("html")) return false;
  const path = req.path;
  const privatePrefixes = [
    "/admin",
    "/dashboard",
    "/seller",
    "/checkout",
    "/orders",
    "/support",
    "/cart",
    "/sign-in",
    "/sign-out",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-required",
  ];
  if (
    path.startsWith("/api/") ||
    path.startsWith("/uploads/") ||
    path.startsWith("/assets/") ||
    privatePrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    ) ||
    path === "/health" ||
    path === "/robots.txt" ||
    path.endsWith(".xml") ||
    path.endsWith(".txt") ||
    /\.(?:svg|png|jpe?g|webp|gif|ico|css|js|map|woff2?|ttf|eot|pdf|zip|csv)$/i.test(path)
  ) {
    return false;
  }
  return true;
}

function fingerprint(req: Request) {
  return createHash("sha256")
    .update(`${firstForwardedIp(req)}|${req.get("user-agent") || ""}`)
    .digest("hex");
}

export function createVisitorSession(req: Request) {
  return issueVisitorSession(fingerprint(req), env.CSRF_SECRET);
}

function duplicateKey(req: Request) {
  return fingerprint(req);
}

function isDuplicate(req: Request) {
  const now = Date.now();
  const ttl = env.VISITOR_NOTIFY_DEDUPE_MINUTES * 60_000;
  const previous = dedupe.get(duplicateKey(req)) || 0;
  if (dedupe.size > 10_000) {
    for (const [entry, timestamp] of dedupe) {
      if (now - timestamp > ttl) dedupe.delete(entry);
      if (dedupe.size <= 7_500) break;
    }
  }
  return now - previous < ttl;
}

function markNotified(req: Request) {
  dedupe.set(duplicateKey(req), Date.now());
}

export function telegramDestinationChatId() {
  return runtimeChatId || env.TELEGRAM_CHAT_ID || PROJECT_DEFAULT_CHAT_ID;
}

export function setTelegramRuntimeChatId(chatId: string) {
  if (!/^-?\d+$/.test(chatId)) {
    throw new Error("Telegram chat ID must be numeric.");
  }
  runtimeChatId = chatId;
  return telegramDestinationChatId();
}

function telegramChatSource() {
  if (runtimeChatId) return "admin-runtime";
  if (env.TELEGRAM_CHAT_ID) return "railway-env";
  return "project-default";
}

export async function sendTelegramMessage(text: string, targetChatId?: string) {
  const chatId = targetChatId || telegramDestinationChatId();
  if (!env.TELEGRAM_BOT_TOKEN || !chatId) {
    return { sent: false as const, reason: "not-configured" as const, chatId };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4096),
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      },
    );
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; description?: string; result?: { message_id?: number } }
      | null;
    if (!response.ok || data?.ok !== true) {
      throw new Error(
        data?.description || `Telegram returned HTTP ${response.status}`,
      );
    }
    return {
      sent: true as const,
      chatId,
      messageId: data.result?.message_id ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function telegramBotStatus() {
  const chatId = telegramDestinationChatId();
  if (!env.TELEGRAM_BOT_TOKEN) {
    return {
      configured: false as const,
      chatConfigured: Boolean(chatId),
      chatId,
      chatSource: telegramChatSource(),
    };
  }
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
    );
    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: { id: number; username?: string; first_name?: string };
    };
    if (!response.ok || !data.ok) {
      return {
        configured: false as const,
        tokenPresent: true as const,
        chatConfigured: Boolean(chatId),
        chatId,
        chatSource: telegramChatSource(),
        error: data.description || `Telegram returned HTTP ${response.status}`,
      };
    }
    return {
      configured: true as const,
      tokenPresent: true as const,
      chatConfigured: Boolean(chatId),
      chatId,
      chatSource: telegramChatSource(),
      visitorNotificationsEnabled: env.VISITOR_NOTIFY_ENABLED,
      supportForwardingEnabled: env.TELEGRAM_SUPPORT_FORWARDING_ENABLED,
      bot: data.result,
    };
  } catch (error) {
    return {
      configured: false as const,
      tokenPresent: true as const,
      chatConfigured: Boolean(chatId),
      chatId,
      chatSource: telegramChatSource(),
      error: error instanceof Error ? error.message : "Could not reach Telegram Bot API.",
    };
  }
}

export async function telegramRecentChats() {
  if (!env.TELEGRAM_BOT_TOKEN) return [];
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates?limit=100&timeout=0`,
  );
  const data = (await response.json()) as {
    ok: boolean;
    description?: string;
    result?: Array<{
      message?: { chat?: TelegramChat };
      edited_message?: { chat?: TelegramChat };
      channel_post?: { chat?: TelegramChat };
      edited_channel_post?: { chat?: TelegramChat };
      callback_query?: { message?: { chat?: TelegramChat } };
    }>;
  };
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram returned HTTP ${response.status}`);
  }
  const chats = new Map<string, TelegramChat>();
  for (const update of data.result || []) {
    const chat =
      update.message?.chat ||
      update.edited_message?.chat ||
      update.channel_post?.chat ||
      update.edited_channel_post?.chat ||
      update.callback_query?.message?.chat;
    if (chat) chats.set(String(chat.id), chat);
  }
  return [...chats.values()];
}

async function visitorMessage(req: Request, client: VisitorClientContext = {}) {
  const ua = req.get("user-agent") || "";
  const baseType = visitorType(ua);
  const engaged = (client.dwellSeconds ?? 0) >= 30 && (client.visibilitySeconds ?? client.dwellSeconds ?? 0) >= 25;
  const type = baseType === "Bot / crawler" ? baseType : engaged ? "Likely human · engaged" : "Likely human";
  const ip = firstForwardedIp(req);
  const headerCode = countryCode(req);
  const headerCity = cityLabel(req);
  const geo = headerCode ? {} : await geoFromIp(ip);
  const code = headerCode || geo.countryCode || "";
  const country = geo.country ? `${geo.country}${code ? ` (${code})` : ""}` : countryLabel(code);
  const city = headerCity || geo.city || "";
  const referrer = client.referrer || req.get("referer") || "Direct / none";
  const language = client.language || req.get("accept-language") || "Unknown";
  let page = client.page || `${req.protocol}://${req.get("host") || "ysello.com"}${req.originalUrl}`;
  try {
    const parsed = new URL(page);
    parsed.protocol = "https:";
    parsed.host = "ysello.com";
    page = parsed.toString();
  } catch {
    page = `https://ysello.com${req.path || "/"}`;
  }
  return {
    type,
    text: [
      baseType === "Bot / crawler" ? "🤖 Ysello crawler" : "🛎 Ysello engaged visitor",
      `Type: ${type}`,
      `Country: ${country}${city ? ` · ${city}` : ""}`,
      `IP: ${ip}`,
      `Browser: ${browserFromUa(ua)}`,
      `Device: ${deviceFromUa(ua)}`,
      `OS: ${osFromUa(ua)}`,
      `Language: ${language}`,
      client.timezone ? `Timezone: ${client.timezone}` : null,
      client.screen ? `Screen: ${client.screen}` : null,
      `Referrer: ${referrer}`,
      `Search / source: ${searchEngineFromReferrer(referrer)}`,
      client.dwellSeconds ? `Time on site: ${Math.round(client.dwellSeconds)} seconds` : null,
      client.pagesViewed ? `Pages viewed: ${client.pagesViewed}` : null,
      typeof client.interactions === "number" ? `Interactions: ${client.interactions}` : null,
      `Page: ${page}`,
      `Time: ${new Date().toISOString()}`,
    ].filter((line): line is string => Boolean(line)).join("\n"),
  };
}

async function queueVisitor(req: Request, client: VisitorClientContext, force: boolean) {
  if (!env.VISITOR_NOTIFY_ENABLED || !env.TELEGRAM_BOT_TOKEN || !force) return false;
  if (!validVisitorSession(client.sessionToken, fingerprint(req), env.CSRF_SECRET)) return false;
  const ua = req.get("user-agent") || "";
  if (!ua || BOT_UA.test(ua) || !/Mozilla\/5\.0/i.test(ua)) return false;
  if (![client.dwellSeconds, client.visibilitySeconds, client.interactions].every(Number.isFinite)) return false;
  if ((client.dwellSeconds ?? 0) < 35 || (client.visibilitySeconds ?? 0) < 30 || (client.interactions ?? 0) < 1) return false;
  try {
    const page = new URL(client.page || "");
    if (page.origin !== "https://ysello.com" && page.origin !== "https://www.ysello.com") return false;
    if (!shouldNotifyPath({ method: "GET", accepts: () => true, path: decodeURIComponent(page.pathname) } as unknown as Request)) return false;
    const origin = req.get("origin");
    if (origin && !["https://ysello.com", "https://www.ysello.com"].includes(origin)) return false;
    if (req.get("sec-fetch-site") === "cross-site") return false;
  } catch { return false; }
  const key = duplicateKey(req);
  if (isDuplicate(req)) return true;
  if (pendingVisitors.has(key)) return false;
  pendingVisitors.add(key);
  try {
    const message = await visitorMessage(req, client);
    const result = await sendTelegramMessage(message.text);
    if (!result.sent) return false;
    markNotified(req);
    return true;
  } catch (error) {
    console.warn("Telegram visitor notification failed:", error instanceof Error ? error.message : error);
    return false;
  } finally {
    pendingVisitors.delete(key);
  }
}

export function queueVisitorTelegramNotification(req: Request) {
  // HTTP page requests never prove human engagement.
  return false;
}

export async function queueVisitorTelegramBeacon(req: Request, client: VisitorClientContext = {}) {
  return queueVisitor(req, client, true);
}

export function queueSupportTelegramNotification(input: {
  sessionId: string;
  name?: string | null;
  email?: string | null;
  body: string;
  authenticatedUserId?: string;
}) {
  if (!env.TELEGRAM_SUPPORT_FORWARDING_ENABLED) return;
  const message = [
    "💬 Ysello support message",
    `Session: ${input.sessionId}`,
    `From: ${input.name || (input.authenticatedUserId ? "Signed-in user" : "Guest")}`,
    input.email ? `Email: ${input.email}` : null,
    input.authenticatedUserId ? `User ID: ${input.authenticatedUserId}` : null,
    "",
    input.body,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  void sendTelegramMessage(message).catch((error) => {
    console.warn(
      "Telegram support forwarding failed:",
      error instanceof Error ? error.message : error,
    );
  });
}

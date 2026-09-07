import type { Request } from "express";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

const dedupe = new Map<string, number>();

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

const BOT_UA = /bot\b|crawler|spider|slurp|bingpreview|google(?:bot|other)|adsbot|mediapartners|duckduckbot|baiduspider|yandex(?:bot|images)|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|applebot|semrushbot|ahrefsbot|mj12bot|bytespider|gptbot|oai-searchbot|chatgpt-user|claude(?:bot|-searchbot|-user)|perplexity(?:bot|-user)|uptimerobot|headlesschrome|lighthouse/i;

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
    path.endsWith(".txt")
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

function isDuplicate(req: Request) {
  const now = Date.now();
  const ttl = env.VISITOR_NOTIFY_DEDUPE_MINUTES * 60_000;
  const key = fingerprint(req);
  const previous = dedupe.get(key) || 0;
  dedupe.set(key, now);

  if (dedupe.size > 10_000) {
    for (const [entry, timestamp] of dedupe) {
      if (now - timestamp > ttl) dedupe.delete(entry);
      if (dedupe.size <= 7_500) break;
    }
  }
  return now - previous < ttl;
}

export async function sendTelegramMessage(text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { sent: false as const, reason: "not-configured" as const };
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
          chat_id: env.TELEGRAM_CHAT_ID,
          text: text.slice(0, 4096),
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      },
    );
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; description?: string }
      | null;
    if (!response.ok || data?.ok !== true) {
      throw new Error(
        data?.description || `Telegram returned HTTP ${response.status}`,
      );
    }
    return { sent: true as const };
  } finally {
    clearTimeout(timeout);
  }
}

export async function telegramBotStatus() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { configured: false as const, chatConfigured: Boolean(env.TELEGRAM_CHAT_ID) };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
  );
  const data = (await response.json()) as {
    ok: boolean;
    description?: string;
    result?: { id: number; username?: string; first_name?: string };
  };
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram returned HTTP ${response.status}`);
  }
  return {
    configured: true as const,
    chatConfigured: Boolean(env.TELEGRAM_CHAT_ID),
    bot: data.result,
  };
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

type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export function queueVisitorTelegramNotification(req: Request) {
  if (!env.VISITOR_NOTIFY_ENABLED || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return;
  }
  if (!shouldNotifyPath(req) || isDuplicate(req)) return;

  const ua = req.get("user-agent") || "";
  const type = visitorType(ua);
  if (type === "Bot / crawler" && !env.VISITOR_NOTIFY_INCLUDE_BOTS) return;

  const ip = firstForwardedIp(req);
  const code = countryCode(req);
  const city = cityLabel(req);
  const referrer = req.get("referer") || "Direct / none";
  const language = req.get("accept-language") || "Unknown";
  const host = req.get("host") || "ysello.com";
  const url = `${req.protocol}://${host}${req.originalUrl}`;
  const message = [
    "🛎 New Ysello visitor",
    `Type: ${type}`,
    `Country: ${countryLabel(code)}${city ? ` · ${city}` : ""}`,
    `IP: ${ip}`,
    `Browser: ${browserFromUa(ua)}`,
    `Device: ${deviceFromUa(ua)}`,
    `OS: ${osFromUa(ua)}`,
    `Language: ${language}`,
    `Referrer: ${referrer}`,
    `Page: ${url}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");

  void sendTelegramMessage(message).catch((error) => {
    console.warn(
      "Telegram visitor notification failed:",
      error instanceof Error ? error.message : error,
    );
  });
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

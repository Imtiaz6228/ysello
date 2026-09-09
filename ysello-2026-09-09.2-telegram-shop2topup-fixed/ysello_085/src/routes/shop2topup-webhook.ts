import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

const businessEvents = new Set(["order.completed", "order.failed", "order.refunded"]);

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseWebhookPayload(rawBody: Buffer) {
  if (!rawBody.length) return null;
  try {
    return JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      timestamp?: string;
      data?: { order_id?: string; status?: string };
    };
  } catch {
    return null;
  }
}

export function shop2TopupWebhookHealth(_req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true, provider: "shop2topup", webhook: "ready" });
}

export function shop2TopupWebhookHandler(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const secret = env.SHOP2TOPUP_WEBHOOK_SECRET;
  const signature = req.get("X-Shop2Topup-Signature") ?? "";
  const headerEvent = req.get("X-Shop2Topup-Event") ?? "";
  const payload = parseWebhookPayload(rawBody);
  const event = payload?.event ?? headerEvent;

  res.setHeader("Cache-Control", "no-store");

  // SHOP2TOPUP performs an HTTPS POST reachability check before saving a new
  // webhook URL. That validation probe may arrive before a signing secret is
  // available and may not carry the normal webhook signature headers. ACK a
  // harmless probe, but never process an unsigned order outcome.
  if (!signature) {
    if (businessEvents.has(event)) {
      res.status(401).json({ ok: false, error: "missing_signature" });
      return;
    }
    res.status(200).json({ ok: true, validation: true });
    return;
  }

  // A signed delivery cannot be authenticated until the signing secret has
  // been copied from SHOP2TOPUP Webhook Management into Railway. Returning a
  // non-2xx here asks the supplier to retry instead of silently losing events.
  if (!secret) {
    res.status(503).json({ ok: false, error: "webhook_secret_not_configured" });
    return;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  if (!secureEqual(expected, signature)) {
    res.status(401).json({ ok: false, error: "invalid_signature" });
    return;
  }

  if (!payload) {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }

  // Acknowledge valid signed deliveries immediately. Supplier order settlement
  // can be keyed idempotently by data.order_id once checkout-side fulfillment
  // is enabled; catalog/admin imports do not create supplier orders themselves.
  console.info("SHOP2TOPUP webhook", {
    event: payload.event ?? (headerEvent || "unknown"),
    orderId: payload.data?.order_id ?? null,
    status: payload.data?.status ?? null,
  });

  res.status(200).json({ ok: true });
}

import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function shop2TopupWebhookHandler(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const secret = env.SHOP2TOPUP_WEBHOOK_SECRET;

  // SHOP2TOPUP validates a new HTTPS URL with a POST before a signing secret is
  // necessarily staged. In this state the endpoint is ACK-only and performs no
  // business action. Once the secret is configured, every delivery is signed.
  if (!secret) {
    res.setHeader("Cache-Control", "no-store");
    res.status(204).end();
    return;
  }

  const signature = req.get("X-Shop2Topup-Signature") ?? "";
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  if (!secureEqual(expected, signature)) {
    res.status(401).end();
    return;
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      data?: { order_id?: string; status?: string };
    };
    // The endpoint deliberately acknowledges quickly. Supplier order settlement
    // can be keyed idempotently by order_id when SHOP2TOPUP checkout products are
    // enabled; catalog/admin integration does not create supplier orders itself.
    console.info("SHOP2TOPUP webhook", {
      event: payload.event ?? req.get("X-Shop2Topup-Event") ?? "unknown",
      orderId: payload.data?.order_id ?? null,
      status: payload.data?.status ?? null,
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).end();
  } catch {
    res.status(400).end();
  }
}

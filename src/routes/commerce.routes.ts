import { Router } from "express";
import {
  DisputeStatus,
  PaymentMethod,
  TicketCategory,
  Role,
} from "@prisma/client";
import { z } from "zod";
import { sha256 } from "../lib/crypto.js";
import { env } from "../config/env.js";
import { createZipBuffer } from "../lib/zip.js";
import { readStoredFileData } from "../lib/stored-file.js";
import { sendTicketUpdateEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { imageUpload, publicUploadUrl } from "../middleware/upload.js";
import {
  activeDisputeWhere,
  autoResolveExpiredDisputes,
  markDisputeTurn,
  responseDeadline,
} from "../services/dispute.service.js";
import {
  availablePaymentMethods,
  checkCryptoPayment,
  confirmCryptoWebhook,
  confirmHostedPayment,
  createCheckout,
  getPaymentStatusForBuyer,
} from "../services/payment.service.js";

export const commerceRouter = Router();

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(30),
  method: z.nativeEnum(PaymentMethod),
  couponCode: z.string().trim().max(40).optional(),
});

const activeDisputeStatuses = new Set<DisputeStatus>([
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.AWAITING_BUYER,
  DisputeStatus.AWAITING_SELLER,
]);

type OrderForDisputeWindow = {
  paidAt: Date | null;
  createdAt: Date;
  disputes?: Array<{ status: DisputeStatus }>;
  items: Array<{ product: { afterSalesServiceHours?: number | null } }>;
};

function getDisputeWindow(order: OrderForDisputeWindow) {
  const windowHours = Math.max(
    12,
    ...order.items.map((item) => item.product.afterSalesServiceHours ?? 12),
  );
  const startsAt = order.paidAt ?? order.createdAt;
  const deadline = new Date(startsAt.getTime() + windowHours * 60 * 60 * 1000);
  const hasActiveDispute = Boolean(
    order.disputes?.some((dispute) =>
      activeDisputeStatuses.has(dispute.status),
    ),
  );
  return {
    disputeWindowHours: windowHours,
    disputeDeadline: deadline.toISOString(),
    canOpenDispute:
      Boolean(order.paidAt) &&
      !hasActiveDispute &&
      Date.now() <= deadline.getTime(),
  };
}

function withDisputeWindow<T extends OrderForDisputeWindow>(order: T) {
  return { ...order, ...getDisputeWindow(order) };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function formatInvoiceMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

commerceRouter.get("/payment-methods", (_req, res) =>
  res.json({ methods: availablePaymentMethods() }),
);

commerceRouter.post(
  "/crypto/webhook",
  asyncHandler(async (req, res) => {
    const providedSecret =
      req.get("x-ysello-crypto-secret") ||
      z.string().optional().parse(req.body?.secret);
    if (
      !env.CRYPTO_WEBHOOK_SECRET ||
      providedSecret !== env.CRYPTO_WEBHOOK_SECRET
    ) {
      throw new ApiError(
        401,
        "Crypto webhook authentication failed.",
        "CRYPTO_WEBHOOK_UNAUTHORIZED",
      );
    }
    const input = z
      .object({
        orderId: z.string().uuid().optional(),
        providerReference: z.string().trim().min(3).max(160).optional(),
        txHash: z.string().trim().max(200).optional(),
        amount: z.string().trim().max(80).optional(),
        asset: z.string().trim().max(40).optional(),
        network: z.string().trim().max(80).optional(),
      })
      .refine(
        (value) => value.orderId || value.providerReference,
        "Provide orderId or providerReference.",
      )
      .parse(req.body);
    const order = await confirmCryptoWebhook(input);
    res.json({ order });
  }),
);

commerceRouter.get(
  "/download/token/:token",
  asyncHandler(async (req, res) => {
    const token = z.string().min(20).max(200).parse(req.params.token);
    const grant = await prisma.downloadGrant.findUnique({
      where: { tokenHash: sha256(token) },
      include: { productFile: true },
    });
    if (
      !grant ||
      grant.revokedAt ||
      grant.expiresAt <= new Date() ||
      grant.downloadCount >= grant.maxDownloads
    ) {
      throw new ApiError(
        410,
        "This download link is expired or has reached its limit.",
        "DOWNLOAD_UNAVAILABLE",
      );
    }
    const fileData = await readStoredFileData(grant.productFile);
    await prisma.$transaction([
      prisma.downloadGrant.update({
        where: { id: grant.id },
        data: { downloadCount: { increment: 1 } },
      }),
      prisma.downloadEvent.create({
        data: {
          downloadGrantId: grant.id,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      }),
    ]);
    res.attachment(grant.productFile.displayName);
    res.type(grant.productFile.mimeType);
    res.send(fileData);
  }),
);

commerceRouter.use(requireAuth, requireVerifiedUser);

commerceRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const input = checkoutSchema.parse(req.body);
    const result = await createCheckout(
      req.auth!.id,
      input.items,
      input.method,
      input.couponCode,
    );
    res.status(201).json(result);
  }),
);

commerceRouter.post(
  "/checkout/:orderId/confirm",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const order = await confirmHostedPayment(orderId, req.auth!.id);
    res.json({ order });
  }),
);

commerceRouter.get(
  "/checkout/:orderId/status",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const status = await getPaymentStatusForBuyer(orderId, req.auth!.id);
    res.json(status);
  }),
);

commerceRouter.post(
  "/checkout/:orderId/check-crypto",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const status = await checkCryptoPayment(orderId, req.auth!.id);
    res.json(status);
  }),
);

commerceRouter.get(
  "/disputes",
  asyncHandler(async (req, res) => {
    await autoResolveExpiredDisputes({
      OR: [{ openedById: req.auth!.id }, { order: { buyerId: req.auth!.id } }],
    });
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { openedById: req.auth!.id },
          { order: { buyerId: req.auth!.id } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { name: true, slug: true, coverImageUrl: true },
                },
              },
            },
          },
        },
        orderItem: {
          include: {
            product: {
              select: { name: true, slug: true, coverImageUrl: true },
            },
          },
        },
        openedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.json({ disputes });
  }),
);

commerceRouter.get(
  "/chats",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.auth!.id, messages: { some: {} } },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          take: 3,
          include: { product: { select: { slug: true, coverImageUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { author: { select: { firstName: true, role: true } } },
        },
        disputes: { where: activeDisputeWhere(), take: 1 },
      },
    });
    res.json({ chats: orders });
  }),
);

commerceRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.auth!.id },
      orderBy: { createdAt: "desc" },
      include: {
        payment: true,
        items: {
          include: {
            product: {
              select: {
                slug: true,
                type: true,
                coverImageUrl: true,
                afterSalesServiceHours: true,
              },
            },
            downloadGrants: {
              include: {
                productFile: {
                  select: {
                    id: true,
                    displayName: true,
                    mimeType: true,
                    sizeBytes: true,
                    version: true,
                  },
                },
              },
            },
            inventoryItems: {
              where: { isActive: true, deliveredAt: { not: null } },
              select: {
                id: true,
                content: true,
                source: true,
                deliveredAt: true,
              },
            },
          },
        },
        refunds: { orderBy: { createdAt: "desc" }, take: 1 },
        disputes: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    res.json({ orders: orders.map(withDisputeWindow) });
  }),
);

commerceRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await autoResolveExpiredDisputes({ orderId: id });
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { buyerId: req.auth!.id },
          { items: { some: { sellerId: req.auth!.id } } },
        ],
      },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        payment: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                type: true,
                coverImageUrl: true,
                afterSalesServiceHours: true,
                deliveryNote: true,
              },
            },
            seller: {
              select: { firstName: true, lastName: true, username: true },
            },
            downloadGrants: {
              include: {
                productFile: {
                  select: {
                    id: true,
                    displayName: true,
                    mimeType: true,
                    sizeBytes: true,
                    version: true,
                  },
                },
              },
            },
            inventoryItems: {
              where: { isActive: true, deliveredAt: { not: null } },
              select: {
                id: true,
                content: true,
                source: true,
                deliveredAt: true,
              },
            },
          },
        },
        refunds: { orderBy: { createdAt: "desc" }, take: 3 },
        disputes: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
    if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
    res.json({ order: withDisputeWindow(order) });
  }),
);

commerceRouter.get(
  "/orders/:id/invoice",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, buyerId: req.auth!.id },
      include: { items: true, payment: true },
    });
    if (!order)
      throw new ApiError(404, "Invoice not found.", "INVOICE_NOT_FOUND");
    const rows = order.items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.productName)}</td><td>${item.quantity}</td><td>${formatInvoiceMoney(item.unitPriceCents, order.currency)}</td><td>${formatInvoiceMoney(item.totalCents, order.currency)}</td></tr>`,
      )
      .join("");
    const invoice = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${escapeHtml(order.invoiceNumber)}</title><style>body{margin:0;padding:32px;color:#172033;background:#f4f7fb;font:15px/1.55 Inter,Arial,sans-serif}.invoice{max-width:820px;margin:auto;padding:38px;border-radius:24px;background:#fff;box-shadow:0 22px 60px rgba(15,23,42,.1)}header{display:flex;justify-content:space-between;gap:24px;padding-bottom:24px;border-bottom:2px solid #eef1f5}h1{margin:0;font-size:38px}header b{color:#5b47d3;font-size:22px}.meta{margin:24px 0;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.meta div{padding:14px;border-radius:12px;background:#f7f8fc}.meta small{display:block;color:#718096}table{width:100%;border-collapse:collapse}th,td{padding:13px 10px;border-bottom:1px solid #e9edf3;text-align:left}th{color:#64748b;font-size:12px}.totals{width:min(340px,100%);margin:24px 0 0 auto}.totals div{padding:8px;display:flex;justify-content:space-between}.totals .grand{margin-top:8px;padding-top:14px;border-top:2px solid #e5e9f0;font-size:20px;font-weight:800}footer{margin-top:34px;color:#64748b;font-size:12px}@media print{body{padding:0;background:#fff}.invoice{max-width:none;padding:20px;box-shadow:none}}@media(max-width:600px){body{padding:12px}.invoice{padding:22px 16px}header{flex-direction:column}.meta{grid-template-columns:1fr}table{font-size:12px}}</style></head><body><main class="invoice"><header><div><small>YSELLO DIGITAL EXCHANGE</small><h1>Invoice</h1></div><b>${escapeHtml(order.invoiceNumber)}</b></header><section class="meta"><div><small>Billed to</small><strong>${escapeHtml(order.buyerName)}</strong><br>${escapeHtml(order.buyerEmail)}</div><div><small>Order</small><strong>${escapeHtml(order.orderNumber)}</strong><br>${new Date(order.createdAt).toLocaleString("en-US")}</div><div><small>Payment status</small><strong>${escapeHtml(order.payment?.status?.replaceAll("_", " ") ?? order.status.replaceAll("_", " "))}</strong></div><div><small>Payment method</small><strong>${escapeHtml(order.payment?.method?.replaceAll("_", " ") ?? "Not recorded")}</strong></div></section><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Subtotal</span><strong>${formatInvoiceMoney(order.subtotalCents, order.currency)}</strong></div><div><span>Discount</span><strong>-${formatInvoiceMoney(order.discountCents, order.currency)}</strong></div><div class="grand"><span>Total</span><strong>${formatInvoiceMoney(order.totalCents, order.currency)}</strong></div></section><footer>This invoice is linked to your protected Ysello order. Use your order workspace for delivery support, seller chat, refunds, or disputes.</footer></main></body></html>`;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader(
      "content-disposition",
      `inline; filename="${order.invoiceNumber.replace(/[^a-z0-9-]+/gi, "-") || "ysello-invoice"}.html"`,
    );
    res.send(invoice);
  }),
);

commerceRouter.get(
  "/downloads/:grantId",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.grantId);
    const grant = await prisma.downloadGrant.findFirst({
      where: { id, orderItem: { order: { buyerId: req.auth!.id } } },
      include: { productFile: true },
    });
    if (
      !grant ||
      grant.revokedAt ||
      grant.expiresAt <= new Date() ||
      grant.downloadCount >= grant.maxDownloads
    ) {
      throw new ApiError(
        410,
        "This download is expired or has reached its limit.",
        "DOWNLOAD_UNAVAILABLE",
      );
    }
    const fileData = await readStoredFileData(grant.productFile);
    await prisma.$transaction([
      prisma.downloadGrant.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      }),
      prisma.downloadEvent.create({
        data: {
          downloadGrantId: id,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      }),
    ]);
    res.attachment(grant.productFile.displayName);
    res.type(grant.productFile.mimeType);
    res.send(fileData);
  }),
);

commerceRouter.get(
  "/order-items/:id/download.zip",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const orderItem = await prisma.orderItem.findFirst({
      where: { id, order: { buyerId: req.auth!.id, paidAt: { not: null } } },
      include: {
        downloadGrants: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          include: { productFile: true },
        },
      },
    });

    const grants =
      orderItem?.downloadGrants.filter(
        (grant) => grant.downloadCount < grant.maxDownloads,
      ) ?? [];
    if (!orderItem || grants.length === 0) {
      throw new ApiError(
        410,
        "No downloadable files are available for this order item.",
        "DOWNLOAD_UNAVAILABLE",
      );
    }

    const zip = await createZipBuffer(
      await Promise.all(
        grants.map(async (grant) => ({
          name: grant.productFile.displayName,
          content: await readStoredFileData(grant.productFile),
        })),
      ),
    );

    await prisma.$transaction(
      grants.flatMap((grant) => [
        prisma.downloadGrant.update({
          where: { id: grant.id },
          data: { downloadCount: { increment: 1 } },
        }),
        prisma.downloadEvent.create({
          data: {
            downloadGrantId: grant.id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
          },
        }),
      ]),
    );

    res.setHeader("content-type", "application/zip");
    res.setHeader(
      "content-disposition",
      `attachment; filename="${orderItem.productName.replace(/[^a-z0-9-]+/gi, "-").slice(0, 80) || "ysello-download"}.zip"`,
    );
    res.send(zip);
  }),
);

commerceRouter.get(
  "/order-items/:id/delivery",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const format = z
      .enum(["txt", "csv", "zip"])
      .default("txt")
      .parse(req.query.format);
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id,
        order: { paidAt: { not: null } },
        OR: [{ order: { buyerId: req.auth!.id } }, { sellerId: req.auth!.id }],
      },
      include: {
        order: { select: { orderNumber: true } },
        inventoryItems: {
          where: { isActive: true, deliveredAt: { not: null } },
          orderBy: { createdAt: "asc" },
          select: { content: true },
        },
      },
    });
    if (!orderItem || !orderItem.inventoryItems.length) {
      throw new ApiError(
        404,
        "No delivered accounts are available for this order item.",
        "DELIVERY_NOT_FOUND",
      );
    }

    const baseName =
      `${orderItem.productName}-${orderItem.order.orderNumber}`
        .replace(/[^a-z0-9-]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90) || "ysello-delivery";
    const text = orderItem.inventoryItems
      .map((item) => item.content)
      .join("\n");
    const csv = [
      "item,delivered_account",
      ...orderItem.inventoryItems.map((item, index) => {
        const escaped = item.content.replaceAll('"', '""');
        return `${index + 1},"${escaped}"`;
      }),
    ].join("\r\n");

    if (format === "zip") {
      const zip = await createZipBuffer([
        { name: `${baseName}.txt`, content: text },
        { name: `${baseName}.csv`, content: csv },
        {
          name: "README.txt",
          content:
            "Your protected Ysello delivery. Keep these account details private and contact the seller through the order chat if assistance is required.",
        },
      ]);
      res.setHeader("content-type", "application/zip");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${baseName}.zip"`,
      );
      res.send(zip);
      return;
    }

    const body = format === "csv" ? csv : text;
    res.setHeader(
      "content-type",
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "text/plain; charset=utf-8",
    );
    res.setHeader(
      "content-disposition",
      `attachment; filename="${baseName}.${format}"`,
    );
    res.send(body);
  }),
);

commerceRouter.post(
  "/orders/:id/refunds",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        reason: z.string().trim().min(20).max(2000),
        amountCents: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const order = await prisma.order.findFirst({
      where: { id: orderId, buyerId: req.auth!.id },
    });
    if (!order || !order.paidAt)
      throw new ApiError(
        400,
        "Only paid orders can be refunded.",
        "REFUND_NOT_ALLOWED",
      );
    const refund = await prisma.refund.create({
      data: {
        orderId,
        requestedById: req.auth!.id,
        reason: input.reason,
        amountCents: Math.min(
          input.amountCents ?? order.totalCents,
          order.totalCents,
        ),
      },
    });
    res.status(201).json({ refund });
  }),
);

commerceRouter.post(
  "/orders/:id/disputes",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        subject: z.string().trim().min(5).max(140),
        description: z.string().trim().min(20).max(4000),
        orderItemId: z.string().uuid().optional(),
        demandRefund: z.boolean().default(false),
      })
      .parse(req.body);
    const order = await prisma.order.findFirst({
      where: { id: orderId, buyerId: req.auth!.id },
      include: {
        items: {
          include: { product: { select: { afterSalesServiceHours: true } } },
        },
        disputes: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (!order.paidAt)
      throw new ApiError(
        400,
        "Only paid orders can be disputed.",
        "DISPUTE_PAYMENT_REQUIRED",
      );
    const window = getDisputeWindow(order);
    if (
      order.disputes.some((dispute) =>
        activeDisputeStatuses.has(dispute.status),
      )
    ) {
      throw new ApiError(
        409,
        "This order already has an active dispute.",
        "DISPUTE_ALREADY_OPEN",
      );
    }
    if (!window.canOpenDispute) {
      throw new ApiError(
        400,
        `The dispute window closed on ${new Date(window.disputeDeadline).toLocaleString()}.`,
        "DISPUTE_WINDOW_CLOSED",
      );
    }
    const orderItemId =
      input.orderItemId &&
      order.items.some((item) => item.id === input.orderItemId)
        ? input.orderItemId
        : order.items[0]?.id;
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        orderItemId,
        openedById: req.auth!.id,
        subject: input.subject,
        description: input.description,
        refundDemanded: input.demandRefund,
        awaitingParty: "SELLER",
        autoCloseAt: responseDeadline(),
        lastBuyerMessageAt: new Date(),
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "DISPUTED" },
    });
    if (input.demandRefund) {
      await prisma.refund
        .create({
          data: {
            orderId,
            requestedById: req.auth!.id,
            reason: `Refund demanded through dispute: ${input.description}`,
            amountCents: order.totalCents,
          },
        })
        .catch(() => undefined);
    }
    res.status(201).json({ dispute });
  }),
);

commerceRouter.post(
  "/disputes/:id/close",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({ resolution: z.string().trim().max(1000).optional() })
      .parse(req.body);
    const dispute = await prisma.dispute.findFirst({
      where: {
        id,
        OR: [
          { openedById: req.auth!.id },
          { order: { buyerId: req.auth!.id } },
        ],
      },
      include: { order: true },
    });
    if (!dispute)
      throw new ApiError(404, "Dispute not found.", "DISPUTE_NOT_FOUND");
    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.CLOSED,
        resolution: input.resolution ?? "Closed by buyer.",
        resolvedAt: new Date(),
        awaitingParty: null,
        autoCloseAt: null,
      },
    });
    res.json({ dispute: updated });
  }),
);

commerceRouter.post(
  "/disputes/:id/refund",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        reason: z.string().trim().min(10).max(2000).optional(),
        amountCents: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const dispute = await prisma.dispute.findFirst({
      where: {
        id,
        OR: [
          { openedById: req.auth!.id },
          { order: { buyerId: req.auth!.id } },
        ],
      },
      include: { order: true },
    });
    if (!dispute?.order.paidAt)
      throw new ApiError(
        400,
        "Only paid disputed orders can request a refund.",
        "REFUND_NOT_ALLOWED",
      );
    const refund = await prisma.refund.create({
      data: {
        orderId: dispute.orderId,
        requestedById: req.auth!.id,
        reason:
          input.reason ?? `Refund demanded for dispute ${dispute.subject}`,
        amountCents: Math.min(
          input.amountCents ?? dispute.order.totalCents,
          dispute.order.totalCents,
        ),
      },
    });
    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        refundDemanded: true,
        status: DisputeStatus.UNDER_REVIEW,
        awaitingParty: null,
        autoCloseAt: null,
      },
    });
    res.status(201).json({ refund, dispute: updated });
  }),
);

commerceRouter.get(
  "/orders/:id/messages",
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.id);
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { buyerId: req.auth!.id },
          { items: { some: { sellerId: req.auth!.id } } },
        ],
      },
    });
    if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
    const messages = await prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, firstName: true, role: true } },
      },
    });
    res.json({ messages });
  }),
);

commerceRouter.post(
  "/orders/:id/messages",
  imageUpload.single("attachment"),
  asyncHandler(async (req, res) => {
    const orderId = z.string().uuid().parse(req.params.id);
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { buyerId: req.auth!.id },
          { items: { some: { sellerId: req.auth!.id } } },
        ],
      },
      include: { items: { select: { sellerId: true } } },
    });
    if (!order) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
    const message = await prisma.orderMessage.create({
      data: {
        orderId,
        authorId: req.auth!.id,
        body,
        attachmentUrl: req.file
          ? publicUploadUrl(req.file.filename)
          : undefined,
        attachmentName: req.file?.originalname,
        attachmentMimeType: req.file?.mimetype,
      },
      include: {
        author: { select: { id: true, firstName: true, role: true } },
      },
    });
    await markDisputeTurn(
      orderId,
      { id: req.auth!.id, role: req.auth!.role as Role },
      order.buyerId,
      [...new Set(order.items.map((item) => String(item.sellerId)))],
    );
    res.status(201).json({ message });
  }),
);

commerceRouter.get(
  "/tickets",
  asyncHandler(async (req, res) => {
    const tickets = await prisma.ticket.findMany({
      where: { creatorId: req.auth!.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { firstName: true, role: true } } },
        },
      },
    });
    res.json({ tickets });
  }),
);

commerceRouter.post(
  "/tickets",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        category: z.nativeEnum(TicketCategory),
        subject: z.string().trim().min(5).max(140),
        body: z.string().trim().min(10).max(4000),
        orderId: z.string().uuid().optional(),
      })
      .parse(req.body);
    if (input.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: input.orderId, buyerId: req.auth!.id },
      });
      if (!order)
        throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
    }
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-${Date.now().toString(36).toUpperCase()}`,
        creatorId: req.auth!.id,
        orderId: input.orderId,
        category: input.category,
        subject: input.subject,
        messages: { create: { authorId: req.auth!.id, body: input.body } },
      },
      include: { messages: true },
    });
    res.status(201).json({ ticket });
  }),
);

commerceRouter.post(
  "/tickets/:id/messages",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const ticket = await prisma.ticket.findFirst({
      where: { id, creatorId: req.auth!.id },
      include: { creator: true },
    });
    if (!ticket)
      throw new ApiError(404, "Ticket not found.", "TICKET_NOT_FOUND");
    const message = await prisma.ticketMessage.create({
      data: { ticketId: id, authorId: req.auth!.id, body },
    });
    await prisma.ticket.update({ where: { id }, data: { status: "OPEN" } });
    await sendTicketUpdateEmail(
      ticket.creator.email,
      ticket.ticketNumber,
      ticket.subject,
      "OPEN",
    );
    res.status(201).json({ message });
  }),
);

commerceRouter.get(
  "/reviews",
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { buyerId: req.auth!.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, slug: true } } },
    });
    res.json({ reviews });
  }),
);

commerceRouter.post(
  "/reviews",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        orderItemId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(10).max(3000),
        mediaUrls: z.array(z.string().url()).max(4).default([]),
      })
      .parse(req.body);
    const item = await prisma.orderItem.findFirst({
      where: {
        id: input.orderItemId,
        order: { buyerId: req.auth!.id, paidAt: { not: null } },
      },
    });
    if (!item)
      throw new ApiError(
        403,
        "Only verified buyers can review this product.",
        "REVIEW_NOT_ALLOWED",
      );
    const review = await prisma.review.create({
      data: {
        productId: item.productId,
        buyerId: req.auth!.id,
        orderItemId: item.id,
        rating: input.rating,
        body: input.body,
        mediaUrls: input.mediaUrls,
      },
    });
    const aggregate = await prisma.review.aggregate({
      where: { productId: item.productId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        averageRating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count,
      },
    });
    res.status(201).json({ review });
  }),
);

commerceRouter.post(
  "/products/:id/report",
  asyncHandler(async (req, res) => {
    const productId = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        reason: z.string().trim().min(3).max(140),
        details: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    const report = await prisma.productReport.create({
      data: { productId, reporterId: req.auth!.id, ...input },
    });
    res.status(201).json({ report });
  }),
);

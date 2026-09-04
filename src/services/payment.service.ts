import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ProductType,
  WalletBalanceKind,
} from "@prisma/client";
import { env } from "../config/env.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendOrderConfirmation } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import {
  createSellerEarningsForOrderItems,
  reverseSellerEarningsForOrder,
} from "./finance.service.js";
import {
  assertDarkShoppingBalance,
  fulfillDarkShoppingOrder,
  refreshDarkShoppingProductsForCheckout,
} from "./dark-shopping-resale.service.js";

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
  expectedUnitPriceCents?: number;
};

type ProviderResult = {
  redirectUrl?: string;
  instructions?: string;
  providerReference?: string;
};

function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

function paypalBaseUrl() {
  return env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken() {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new ApiError(
      503,
      "PayPal is not configured yet.",
      "PAYMENT_METHOD_UNAVAILABLE",
    );
  }

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new ApiError(
      502,
      data.error_description ?? "PayPal could not initialize this payment.",
      "PAYPAL_ERROR",
    );
  }
  return data.access_token;
}

async function createStripeSession(order: {
  id: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
  buyerEmail: string;
}) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(
      503,
      "Stripe is not configured yet.",
      "PAYMENT_METHOD_UNAVAILABLE",
    );
  }
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set(
    "success_url",
    `${env.APP_URL}/checkout/confirmation?order=${encodeURIComponent(order.id)}&provider=stripe`,
  );
  body.set("cancel_url", `${env.APP_URL}/checkout?payment=cancelled`);
  body.set("customer_email", order.buyerEmail);
  body.set("client_reference_id", order.id);
  body.set("metadata[orderId]", order.id);
  body.set("line_items[0][price_data][currency]", order.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(order.totalCents));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Ysello order ${order.orderNumber}`,
  );
  body.set("line_items[0][quantity]", "1");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !data.id || !data.url) {
    throw new ApiError(
      502,
      data.error?.message ?? "Stripe could not initialize this payment.",
      "STRIPE_ERROR",
    );
  }
  return { redirectUrl: data.url, providerReference: data.id };
}

async function createPaypalOrder(order: {
  id: string;
  orderNumber: string;
  totalCents: number;
  currency: string;
}) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "paypal-request-id": order.id,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          custom_id: order.orderNumber,
          amount: {
            currency_code: order.currency,
            value: (order.totalCents / 100).toFixed(2),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: "PAY_NOW",
            return_url: `${env.APP_URL}/checkout/confirmation?order=${encodeURIComponent(order.id)}&provider=paypal`,
            cancel_url: `${env.APP_URL}/checkout?payment=cancelled`,
          },
        },
      },
    }),
  });
  const data = (await response.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
    message?: string;
  };
  const approve = data.links?.find((link) =>
    ["payer-action", "approve"].includes(link.rel),
  );
  if (!response.ok || !data.id || !approve) {
    throw new ApiError(
      502,
      data.message ?? "PayPal could not initialize this payment.",
      "PAYPAL_ERROR",
    );
  }
  return { redirectUrl: approve.href, providerReference: data.id };
}

function cryptoAddress() {
  if (env.CRYPTO_PAYMENT_ADDRESS) return env.CRYPTO_PAYMENT_ADDRESS;
  const match = env.CRYPTO_PAYMENT_INSTRUCTIONS?.match(
    /(?:address|wallet)\s*[:=-]\s*([A-Za-z0-9:_\-.]+)/i,
  );
  return match?.[1];
}

type CryptoPaymentPayload = {
  kind: "CRYPTO_INVOICE";
  asset: string;
  network: string;
  address: string;
  amountUsdCents: number;
  amountLabel: string;
  expiresAt: string;
  providerReference: string;
  instructions: string;
  status: "AWAITING_PAYMENT" | "DETECTED" | "EXPIRED" | "PAID";
  txHash?: string;
  detectedAt?: string;
};

function createCryptoPaymentPayload(
  order: { orderNumber: string; totalCents: number; currency: string },
  providerReference: string,
): CryptoPaymentPayload {
  const address = cryptoAddress();
  if (!address) {
    throw new ApiError(
      503,
      "Crypto checkout is not configured. Add CRYPTO_PAYMENT_ADDRESS or CRYPTO_PAYMENT_INSTRUCTIONS.",
      "PAYMENT_METHOD_UNAVAILABLE",
    );
  }
  const asset = env.CRYPTO_PAYMENT_ASSET || "USDT";
  const network = env.CRYPTO_PAYMENT_NETWORK || "TRC20";
  const amountLabel = `${(order.totalCents / 100).toFixed(2)} ${order.currency}`;
  const expiresAt = new Date(
    Date.now() + env.CRYPTO_PAYMENT_TIMEOUT_MINUTES * 60 * 1000,
  ).toISOString();
  const instructions =
    env.CRYPTO_PAYMENT_INSTRUCTIONS ||
    `Send exactly ${amountLabel} worth of ${asset} on ${network} to ${address}. Use order ${order.orderNumber} as the payment reference. The invoice expires at ${new Date(expiresAt).toLocaleString()}.`;

  return {
    kind: "CRYPTO_INVOICE",
    asset,
    network,
    address,
    amountUsdCents: order.totalCents,
    amountLabel,
    expiresAt,
    providerReference,
    instructions,
    status: "AWAITING_PAYMENT",
  };
}

export function availablePaymentMethods() {
  return [
    {
      id: PaymentMethod.STRIPE,
      label: "Card / Stripe",
      available: Boolean(env.STRIPE_SECRET_KEY),
      kind: "hosted",
    },
    {
      id: PaymentMethod.PAYPAL,
      label: "PayPal",
      available: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
      kind: "hosted",
    },
    {
      id: PaymentMethod.BANK_TRANSFER,
      label: "Local bank transfer",
      available: Boolean(env.BANK_TRANSFER_INSTRUCTIONS),
      kind: "manual",
    },
    {
      id: PaymentMethod.CRYPTO,
      label: `${env.CRYPTO_PAYMENT_ASSET || "USDT"} crypto checkout`,
      available: Boolean(cryptoAddress()),
      kind: "crypto",
    },
  ];
}

async function checkoutBuyer(buyerId: string) {
  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer || buyer.isSuspended)
    throw new ApiError(
      403,
      "This account cannot place orders.",
      "ACCOUNT_RESTRICTED",
    );
  return buyer;
}

async function checkoutProducts(items: CheckoutItemInput[]) {
  const normalized = new Map<string, number>();
  const expectedUnitPrices = new Map<string, number>();
  for (const item of items) {
    normalized.set(
      item.productId,
      (normalized.get(item.productId) ?? 0) + item.quantity,
    );
    if (item.expectedUnitPriceCents !== undefined) {
      const previous = expectedUnitPrices.get(item.productId);
      if (previous !== undefined && previous !== item.expectedUnitPriceCents) {
        throw new ApiError(
          400,
          "Conflicting expected prices were submitted for the same product.",
          "CHECKOUT_PRICE_INVALID",
        );
      }
      expectedUnitPrices.set(item.productId, item.expectedUnitPriceCents);
    }
  }
  const productIds = [...normalized.keys()];
  await refreshDarkShoppingProductsForCheckout(productIds);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      status: ProductStatus.APPROVED,
      seller: {
        isSuspended: false,
        sellerProfile: { isSuspended: false, isVerified: true },
      },
    },
    include: {
      files: { where: { isActive: true }, select: { id: true } },
      inventoryItems: {
        where: { isActive: true, orderItemId: null },
        select: { id: true },
      },
      darkShoppingListing: {
        select: {
          id: true,
          isEnabled: true,
          remoteQuantity: true,
          remoteMinimumOrder: true,
          supplierPriceRubCents: true,
        },
      },
    },
  });
  if (!products.length || products.length !== productIds.length) {
    const availableIds = new Set(products.map((product) => product.id));
    throw new ApiError(
      409,
      "Your cart contains a product that is no longer published. Remove it from the cart and try again.",
      "PRODUCT_UNAVAILABLE",
      {
        unavailableProductIds: productIds.filter((id) => !availableIds.has(id)),
      },
    );
  }
  for (const product of products) {
    const requestedQuantity = normalized.get(product.id) ?? 1;
    if (requestedQuantity < product.minimumOrder) {
      throw new ApiError(
        409,
        `${product.name} requires a minimum quantity of ${product.minimumOrder}.`,
        "PRODUCT_MINIMUM_ORDER",
      );
    }
    if (
      product.maximumOrder !== null &&
      requestedQuantity > product.maximumOrder
    ) {
      throw new ApiError(
        409,
        `${product.name} allows a maximum quantity of ${product.maximumOrder}.`,
        "PRODUCT_MAXIMUM_ORDER",
      );
    }
    if (product.darkShoppingListing) {
      const expectedPrice = expectedUnitPrices.get(product.id);
      if (expectedPrice === undefined || expectedPrice !== product.priceCents) {
        throw new ApiError(
          409,
          `${product.name}'s supplier price changed. Review the updated price before paying.`,
          "PRODUCT_PRICE_CHANGED",
          {
            productId: product.id,
            currentUnitPriceCents: product.priceCents,
            currentPriceCnyCents: product.priceCnyCents,
            currentPriceRubCents: product.priceRubCents,
          },
        );
      }
      if (
        !product.darkShoppingListing.isEnabled ||
        product.darkShoppingListing.remoteQuantity < requestedQuantity ||
        requestedQuantity < product.darkShoppingListing.remoteMinimumOrder
      ) {
        throw new ApiError(
          409,
          `${product.name} is no longer available in the requested quantity from the supplier.`,
          "PRODUCT_OUT_OF_STOCK",
        );
      }
      continue;
    }
    const isLineInventoryProduct =
      product.type === ProductType.DOWNLOAD && product.files.length === 0;
    if (
      isLineInventoryProduct &&
      product.inventoryItems.length < requestedQuantity
    ) {
      throw new ApiError(
        409,
        `${product.name} needs ${requestedQuantity} available delivery row${requestedQuantity === 1 ? "" : "s"}, but only ${product.inventoryItems.length} remain.`,
        "PRODUCT_OUT_OF_STOCK",
      );
    }
  }
  const supplierCostRubCents = products.reduce(
    (total, product) =>
      total +
      (product.darkShoppingListing?.supplierPriceRubCents ?? 0) *
        (normalized.get(product.id) ?? 1),
    0,
  );
  await assertDarkShoppingBalance(supplierCostRubCents);
  const subtotalCents = products.reduce(
    (total, product) =>
      total + product.priceCents * (normalized.get(product.id) ?? 1),
    0,
  );
  return { normalized, products, subtotalCents };
}

export async function createCheckout(
  buyerId: string,
  items: CheckoutItemInput[],
  method: PaymentMethod,
  couponCode?: string,
) {
  const paymentOption = availablePaymentMethods().find(
    (option) => option.id === method,
  );
  if (!paymentOption?.available) {
    throw new ApiError(
      400,
      "That payment method is not available.",
      "PAYMENT_METHOD_UNAVAILABLE",
    );
  }

  const buyer = await checkoutBuyer(buyerId);
  const { normalized, products, subtotalCents } = await checkoutProducts(items);
  if (couponCode && products.some((product) => product.darkShoppingListing)) {
    throw new ApiError(
      400,
      "Coupons cannot be applied to supplier-fulfilled products because their configured resale margin must be protected.",
      "SUPPLIER_COUPON_NOT_ALLOWED",
    );
  }
  const now = new Date();
  const coupon = couponCode
    ? await prisma.coupon.findFirst({
        where: {
          code: couponCode.trim().toUpperCase(),
          isActive: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      })
    : null;

  if (couponCode && !coupon)
    throw new ApiError(400, "Coupon is invalid or expired.", "COUPON_INVALID");
  if (
    coupon &&
    coupon.maxRedemptions !== null &&
    coupon.redemptionCount >= coupon.maxRedemptions
  ) {
    throw new ApiError(
      400,
      "Coupon has reached its redemption limit.",
      "COUPON_LIMIT",
    );
  }
  if (coupon && subtotalCents < coupon.minimumCents)
    throw new ApiError(
      400,
      "Order does not meet the coupon minimum.",
      "COUPON_MINIMUM",
    );
  const discountCents = coupon
    ? Math.min(
        subtotalCents,
        coupon.percentOff
          ? Math.round((subtotalCents * coupon.percentOff) / 100)
          : (coupon.amountOffCents ?? 0),
      )
    : 0;

  const totalCents = subtotalCents - discountCents;
  const order = await prisma.order.create({
    data: {
      orderNumber: reference("HS"),
      invoiceNumber: reference("INV"),
      buyerId,
      couponId: coupon?.id,
      subtotalCents,
      discountCents,
      totalCents,
      buyerEmail: buyer.email,
      buyerName: `${buyer.firstName} ${buyer.lastName}`,
      items: {
        create: products.map((product) => ({
          productId: product.id,
          sellerId: product.sellerId,
          productName: product.name,
          quantity: normalized.get(product.id) ?? 1,
          unitPriceCents: product.priceCents,
          totalCents: product.priceCents * (normalized.get(product.id) ?? 1),
        })),
      },
      payment: {
        create: {
          method,
          amountCents: totalCents,
          currency: "USD",
          status: PaymentStatus.REQUIRES_ACTION,
        },
      },
    },
    include: { payment: true, items: true },
  });

  let provider: ProviderResult & { cryptoPayment?: CryptoPaymentPayload };
  try {
    if (method === PaymentMethod.STRIPE)
      provider = await createStripeSession(order);
    else if (method === PaymentMethod.PAYPAL)
      provider = await createPaypalOrder(order);
    else if (method === PaymentMethod.BANK_TRANSFER)
      provider = { instructions: env.BANK_TRANSFER_INSTRUCTIONS };
    else if (method === PaymentMethod.CRYPTO) {
      const providerReference = reference("CRYPTO");
      const cryptoPayment = createCryptoPaymentPayload(
        order,
        providerReference,
      );
      provider = {
        instructions: cryptoPayment.instructions,
        providerReference,
        cryptoPayment,
      };
    } else
      provider = {
        instructions: `Order ${order.orderNumber} is awaiting staff approval. Add proof of payment in support if requested.`,
      };
  } catch (error) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason:
          error instanceof Error ? error.message : "Provider error",
      },
    });
    throw error;
  }

  if (provider.providerReference || provider.cryptoPayment) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        providerReference: provider.providerReference,
        providerPayload: provider.cryptoPayment ?? undefined,
      },
    });
  }
  if (coupon)
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { redemptionCount: { increment: 1 } },
    });

  return { order, ...provider };
}

export async function createWalletCheckout(
  buyerId: string,
  items: CheckoutItemInput[],
) {
  const buyer = await checkoutBuyer(buyerId);
  const { normalized, products, subtotalCents } = await checkoutProducts(items);

  if (buyer.balanceCents < subtotalCents) {
    throw new ApiError(
      402,
      `Insufficient wallet balance. You need ${money(subtotalCents, "USD")} but have ${money(buyer.balanceCents, "USD")}.`,
      "INSUFFICIENT_FUNDS",
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const freshBuyer = await tx.user.findUnique({
      where: { id: buyerId },
      select: {
        balanceCents: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!freshBuyer || freshBuyer.balanceCents < subtotalCents) {
      throw new ApiError(
        402,
        "Insufficient wallet balance for this order.",
        "INSUFFICIENT_FUNDS",
      );
    }
    const debited = await tx.user.updateMany({
      where: {
        id: buyerId,
        balanceCents: { gte: subtotalCents },
      },
      data: {
        balanceCents: { decrement: subtotalCents },
      },
    });
    if (debited.count !== 1) {
      throw new ApiError(
        409,
        "Your wallet balance changed. Refresh checkout and try again.",
        "INSUFFICIENT_FUNDS",
      );
    }
    const account = await tx.user.findUniqueOrThrow({
      where: { id: buyerId },
      select: { balanceCents: true },
    });
    const createdOrder = await tx.order.create({
      data: {
        orderNumber: reference("HS"),
        invoiceNumber: reference("INV"),
        buyerId,
        status: OrderStatus.AWAITING_PAYMENT,
        subtotalCents,
        discountCents: 0,
        totalCents: subtotalCents,
        buyerEmail: freshBuyer.email,
        buyerName: `${freshBuyer.firstName} ${freshBuyer.lastName}`,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            sellerId: product.sellerId,
            productName: product.name,
            quantity: normalized.get(product.id) ?? 1,
            unitPriceCents: product.priceCents,
            totalCents: product.priceCents * (normalized.get(product.id) ?? 1),
          })),
        },
        payment: {
          create: {
            method: PaymentMethod.MANUAL,
            amountCents: subtotalCents,
            currency: "USD",
            status: PaymentStatus.REQUIRES_ACTION,
            providerReference: reference("WALLET"),
            providerPayload: {
              kind: "WALLET_BALANCE",
              debitedCents: subtotalCents,
            },
          },
        },
      },
      include: { payment: true, items: true },
    });
    await tx.walletTransaction.create({
      data: {
        userId: buyerId,
        type: "PURCHASE",
        balanceKind: WalletBalanceKind.BUYER,
        amountCents: -subtotalCents,
        balanceAfter: account.balanceCents,
        description: `Wallet purchase ${createdOrder.orderNumber}`,
        reference: createdOrder.orderNumber,
        orderId: createdOrder.id,
        relatedId: createdOrder.payment?.id,
      },
    });
    return createdOrder;
  });

  try {
    const completedOrder = await completePayment(order.id);
    const updatedBuyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { balanceCents: true },
    });
    return {
      order: completedOrder,
      balanceCents: updatedBuyer?.balanceCents ?? 0,
    };
  } catch (error) {
    // If completion committed but the follow-up read failed, never refund a
    // paid order. Re-read first, then make the failure/refund transition itself
    // conditional so it cannot race a payment confirmation.
    const paymentState = await prisma.payment
      .findUnique({
        where: { orderId: order.id },
        select: { status: true },
      })
      .catch(() => null);
    if (paymentState?.status === PaymentStatus.PAID) {
      const completedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { payment: true, items: true },
      });
      const updatedBuyer = await prisma.user.findUnique({
        where: { id: buyerId },
        select: { balanceCents: true },
      });
      return {
        order: completedOrder ?? order,
        balanceCents: updatedBuyer?.balanceCents ?? 0,
      };
    }

    const refunded = await prisma.$transaction(async (tx) => {
      const failed = await tx.payment.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: [PaymentStatus.PENDING, PaymentStatus.REQUIRES_ACTION],
          },
        },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message : "Wallet delivery failed",
        },
      });
      if (failed.count !== 1) return false;

      const account = await tx.user.update({
        where: { id: buyerId },
        data: { balanceCents: { increment: subtotalCents } },
        select: { balanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId: buyerId,
          type: "REFUND",
          balanceKind: WalletBalanceKind.BUYER,
          amountCents: subtotalCents,
          balanceAfter: account.balanceCents,
          description: `Cancelled wallet purchase ${order.orderNumber}`,
          reference: order.orderNumber,
          orderId: order.id,
          relatedId: order.payment?.id,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      return true;
    });
    if (!refunded) {
      const current = await prisma.payment.findUnique({
        where: { orderId: order.id },
        select: { status: true },
      });
      if (current?.status === PaymentStatus.PAID) {
        const completedOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { payment: true, items: true },
        });
        const updatedBuyer = await prisma.user.findUnique({
          where: { id: buyerId },
          select: { balanceCents: true },
        });
        return {
          order: completedOrder ?? order,
          balanceCents: updatedBuyer?.balanceCents ?? 0,
        };
      }
    }
    throw error;
  }
}

export async function completePayment(orderId: string, approvedById?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      items: {
        include: {
          product: {
            include: {
              files: {
                where: { isActive: true },
                select: { id: true, displayName: true },
              },
              darkShoppingListing: {
                select: {
                  id: true,
                  supplierPriceRubCents: true,
                  isEnabled: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order?.payment)
    throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  if (order.payment.status === PaymentStatus.PAID) return order;

  const rawLinks: Array<{ name: string; token: string }> = [];
  const paidAt = new Date();
  const autoDeliver = order.items.every(
    (item) =>
      item.product.type === ProductType.DOWNLOAD &&
      !item.product.darkShoppingListing,
  );

  const completedNow = await prisma.$transaction(async (tx) => {
    // Claim this transition atomically. Provider callbacks, buyer polling, and
    // an admin action can arrive together; only one may create delivery grants,
    // increment sales, or allocate seller earnings.
    const claimed = await tx.payment.updateMany({
      where: {
        orderId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.REQUIRES_ACTION] },
      },
      data: {
        status: PaymentStatus.PAID,
        approvedById,
        approvedAt: paidAt,
      },
    });
    if (claimed.count !== 1) {
      const current = await tx.payment.findUnique({
        where: { orderId },
        select: { status: true },
      });
      if (current?.status === PaymentStatus.PAID) return false;
      throw new ApiError(
        409,
        "This payment can no longer be completed.",
        "PAYMENT_NOT_COMPLETABLE",
      );
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: autoDeliver ? OrderStatus.DELIVERED : OrderStatus.PROCESSING,
        paidAt,
        completedAt: autoDeliver ? paidAt : undefined,
      },
    });
    const automaticItemIds = order.items
      .filter(
        (item) =>
          item.product.type === ProductType.DOWNLOAD &&
          !item.product.darkShoppingListing,
      )
      .map((item) => item.id);
    if (automaticItemIds.length) {
      await tx.orderItem.updateMany({
        where: { id: { in: automaticItemIds }, deliveredAt: null },
        data: {
          deliveredAt: paidAt,
          deliveryMessage:
            "Delivered automatically after payment confirmation.",
        },
      });
    }
    await createSellerEarningsForOrderItems(
      tx,
      order.id,
      order.totalCents,
      order.items.map((item) => ({
        id: item.id,
        sellerId: item.sellerId,
        totalCents: item.totalCents,
      })),
      paidAt,
    );
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { salesCount: { increment: item.quantity } },
      });
      await tx.sellerProfile.updateMany({
        where: { userId: item.sellerId },
        data: { totalSales: { increment: item.quantity } },
      });
      if (item.product.darkShoppingListing) {
        await tx.darkShoppingFulfillment.upsert({
          where: { orderItemId: item.id },
          create: {
            listingId: item.product.darkShoppingListing.id,
            orderItemId: item.id,
            idempotenceId: `ysello-${item.id}`,
            supplierUnitPriceRubCents:
              item.product.darkShoppingListing.supplierPriceRubCents,
            quantity: item.quantity,
          },
          update: {},
        });
      } else if (item.product.type === ProductType.DOWNLOAD) {
        for (const file of item.product.files) {
          const token = randomToken(40);
          await tx.downloadGrant.create({
            data: {
              orderItemId: item.id,
              productFileId: file.id,
              tokenHash: sha256(token),
              maxDownloads: item.product.downloadLimit,
              expiresAt: new Date(
                Date.now() + item.product.downloadExpiryHours * 60 * 60 * 1000,
              ),
            },
          });
          rawLinks.push({
            name: `${item.productName} — ${file.displayName}`,
            token,
          });
        }

        // File products deliver by grant. A product without files delivers
        // unique inventory rows; claim them with an orderItemId-null guard so
        // two simultaneous buyers can never receive the same row.
        if (item.product.files.length === 0) {
          const inventoryRows = await tx.productInventoryItem.findMany({
            where: {
              productId: item.productId,
              isActive: true,
              orderItemId: null,
            },
            orderBy: { createdAt: "asc" },
            take: item.quantity,
            select: { id: true },
          });
          if (inventoryRows.length < item.quantity) {
            throw new ApiError(
              409,
              `${item.productName} no longer has enough available inventory.`,
              "PRODUCT_OUT_OF_STOCK",
            );
          }
          const allocated = await tx.productInventoryItem.updateMany({
            where: {
              id: { in: inventoryRows.map((row) => row.id) },
              isActive: true,
              orderItemId: null,
            },
            data: { orderItemId: item.id, deliveredAt: paidAt },
          });
          if (allocated.count !== item.quantity) {
            throw new ApiError(
              409,
              `${item.productName} inventory changed during checkout. No funds were captured; try again.`,
              "PRODUCT_OUT_OF_STOCK",
            );
          }
        }
      }
    }
    return true;
  });

  if (completedNow) {
    await fulfillDarkShoppingOrder(orderId).catch((error) => {
      console.error(
        `Order ${order.orderNumber} is paid, but supplier fulfillment is still pending:`,
        error instanceof Error ? error.message : error,
      );
    });
  }

  if (completedNow) {
    try {
      await sendOrderConfirmation(
        order.buyerEmail,
        order.buyerName,
        order.orderNumber,
        order.invoiceNumber,
        money(order.totalCents, order.currency),
        rawLinks.map((link) => ({
          name: link.name,
          url: `${env.API_URL}/api/commerce/download/token/${encodeURIComponent(link.token)}`,
        })),
      );
    } catch (error) {
      console.error(
        `Order ${order.orderNumber} was paid and delivered, but the confirmation email could not be sent:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, items: true },
  });
}

export async function getPaymentStatusForBuyer(
  orderId: string,
  buyerId: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId },
    include: { payment: true, items: true },
  });
  if (!order?.payment)
    throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");

  const payload = order.payment.providerPayload as CryptoPaymentPayload | null;
  if (
    order.payment.method === PaymentMethod.CRYPTO &&
    payload?.kind === "CRYPTO_INVOICE" &&
    order.payment.status === PaymentStatus.REQUIRES_ACTION
  ) {
    const expired = new Date(payload.expiresAt).getTime() <= Date.now();
    if (expired) {
      const expiredPayload = { ...payload, status: "EXPIRED" as const };
      await prisma.$transaction([
        prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.CANCELLED,
            providerPayload: expiredPayload,
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        }),
      ]);
      return {
        order: {
          ...order,
          status: OrderStatus.CANCELLED,
          payment: {
            ...order.payment,
            status: PaymentStatus.CANCELLED,
            providerPayload: expiredPayload,
          },
        },
        cryptoPayment: expiredPayload,
      };
    }
  }

  return {
    order,
    cryptoPayment: payload?.kind === "CRYPTO_INVOICE" ? payload : undefined,
  };
}

export async function checkCryptoPayment(orderId: string, buyerId: string) {
  const status = await getPaymentStatusForBuyer(orderId, buyerId);
  if (status.order.payment?.status === PaymentStatus.PAID) return status;
  if (status.order.payment?.method !== PaymentMethod.CRYPTO) {
    throw new ApiError(
      400,
      "This order is not a crypto checkout.",
      "PAYMENT_METHOD_INVALID",
    );
  }
  return status;
}

export async function confirmCryptoWebhook(input: {
  orderId?: string;
  providerReference?: string;
  txHash?: string;
  amount?: string;
  asset?: string;
  network?: string;
}) {
  if (!env.CRYPTO_WEBHOOK_SECRET) {
    throw new ApiError(
      503,
      "Crypto webhook is not enabled.",
      "CRYPTO_WEBHOOK_DISABLED",
    );
  }
  const payment = await prisma.payment.findFirst({
    where: {
      method: PaymentMethod.CRYPTO,
      status: PaymentStatus.REQUIRES_ACTION,
      OR: [
        input.orderId ? { orderId: input.orderId } : undefined,
        input.providerReference
          ? { providerReference: input.providerReference }
          : undefined,
      ].filter(Boolean) as Array<
        { orderId: string } | { providerReference: string }
      >,
    },
    include: { order: true },
  });
  if (!payment)
    throw new ApiError(
      404,
      "Pending crypto payment not found.",
      "PAYMENT_NOT_FOUND",
    );
  const payload = payment.providerPayload as CryptoPaymentPayload | null;
  if (
    payload?.kind === "CRYPTO_INVOICE" &&
    new Date(payload.expiresAt).getTime() <= Date.now()
  ) {
    throw new ApiError(
      410,
      "Crypto invoice expired.",
      "CRYPTO_INVOICE_EXPIRED",
    );
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPayload:
        payload?.kind === "CRYPTO_INVOICE"
          ? {
              ...payload,
              status: "DETECTED",
              txHash: input.txHash,
              detectedAt: new Date().toISOString(),
            }
          : {
              kind: "CRYPTO_DETECTED",
              txHash: input.txHash,
              detectedAt: new Date().toISOString(),
              amount: input.amount,
              asset: input.asset,
              network: input.network,
            },
    },
  });
  return completePayment(payment.orderId);
}

export async function confirmHostedPayment(orderId: string, buyerId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, buyerId },
    include: { payment: true },
  });
  if (!order?.payment)
    throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  if (order.payment.status === PaymentStatus.PAID) return order;
  const providerReference = order.payment.providerReference;
  if (!providerReference)
    throw new ApiError(
      400,
      "Payment has no provider reference.",
      "PAYMENT_REFERENCE_MISSING",
    );

  if (order.payment.method === PaymentMethod.STRIPE) {
    if (!env.STRIPE_SECRET_KEY)
      throw new ApiError(
        503,
        "Stripe is unavailable.",
        "PAYMENT_METHOD_UNAVAILABLE",
      );
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(providerReference)}`,
      { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    );
    const data = (await response.json()) as {
      payment_status?: string;
      client_reference_id?: string;
      error?: { message?: string };
    };
    if (
      !response.ok ||
      data.payment_status !== "paid" ||
      data.client_reference_id !== order.id
    ) {
      throw new ApiError(
        402,
        data.error?.message ?? "Stripe payment is not confirmed.",
        "PAYMENT_NOT_CONFIRMED",
      );
    }
  } else if (order.payment.method === PaymentMethod.PAYPAL) {
    const accessToken = await paypalAccessToken();
    const response = await fetch(
      `${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(providerReference)}/capture`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "paypal-request-id": `${order.id}-capture`,
        },
      },
    );
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      purchase_units?: Array<{
        payments?: { captures?: Array<{ id: string }> };
      }>;
    };
    if (!response.ok || data.status !== "COMPLETED")
      throw new ApiError(
        402,
        data.message ?? "PayPal payment is not confirmed.",
        "PAYMENT_NOT_CONFIRMED",
      );
    const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if (captureId) {
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { providerPayload: { captureId } },
      });
    }
  } else {
    throw new ApiError(
      400,
      "This payment is not a hosted provider checkout.",
      "MANUAL_APPROVAL_REQUIRED",
    );
  }
  return completePayment(order.id);
}

export async function issueRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { include: { payment: true } } },
  });
  if (!refund?.order.payment)
    throw new ApiError(404, "Refund or payment not found.", "REFUND_NOT_FOUND");
  const payment = refund.order.payment;
  let providerRefundId: string | undefined;

  if (payment.method === PaymentMethod.STRIPE) {
    if (!env.STRIPE_SECRET_KEY || !payment.providerReference)
      throw new ApiError(
        503,
        "Stripe refund is not configured.",
        "REFUND_PROVIDER_UNAVAILABLE",
      );
    const sessionResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(payment.providerReference)}`,
      { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    );
    const session = (await sessionResponse.json()) as {
      payment_intent?: string;
      error?: { message?: string };
    };
    if (!sessionResponse.ok || !session.payment_intent)
      throw new ApiError(
        502,
        session.error?.message ?? "Stripe payment could not be retrieved.",
        "STRIPE_ERROR",
      );
    const body = new URLSearchParams({
      payment_intent: session.payment_intent,
      amount: String(refund.amountCents),
      "metadata[yselloRefundId]": refund.id,
    });
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await response.json()) as {
      id?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id)
      throw new ApiError(
        502,
        data.error?.message ?? "Stripe refund failed.",
        "STRIPE_REFUND_ERROR",
      );
    providerRefundId = data.id;
  } else if (payment.method === PaymentMethod.PAYPAL) {
    const payload = payment.providerPayload as { captureId?: string } | null;
    if (!payload?.captureId)
      throw new ApiError(
        400,
        "PayPal capture reference is missing.",
        "PAYPAL_CAPTURE_MISSING",
      );
    const accessToken = await paypalAccessToken();
    const response = await fetch(
      `${paypalBaseUrl()}/v2/payments/captures/${encodeURIComponent(payload.captureId)}/refund`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "paypal-request-id": refund.id,
        },
        body: JSON.stringify({
          amount: {
            currency_code: refund.order.currency,
            value: (refund.amountCents / 100).toFixed(2),
          },
        }),
      },
    );
    const data = (await response.json()) as { id?: string; message?: string };
    if (!response.ok || !data.id)
      throw new ApiError(
        502,
        data.message ?? "PayPal refund failed.",
        "PAYPAL_REFUND_ERROR",
      );
    providerRefundId = data.id;
  }

  const fullRefund = refund.amountCents >= refund.order.totalCents;
  const isWalletPayment =
    payment.method === PaymentMethod.MANUAL &&
    (payment.providerPayload as any)?.kind === "WALLET_BALANCE";
  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        status: "COMPLETED",
        providerReference: providerRefundId,
        resolvedAt: new Date(),
      },
    });
    await tx.order.update({
      where: { id: refund.orderId },
      data: { status: fullRefund ? "REFUNDED" : undefined },
    });
    await tx.payment.update({
      where: { orderId: refund.orderId },
      data: { status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    await tx.downloadGrant.updateMany({
      where: { orderItem: { orderId: refund.orderId } },
      data: { revokedAt: fullRefund ? new Date() : undefined },
    });
    if (isWalletPayment) {
      const account = await tx.user.update({
        where: { id: refund.order.buyerId },
        data: { balanceCents: { increment: refund.amountCents } },
        select: { balanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId: refund.order.buyerId,
          type: "REFUND",
          balanceKind: WalletBalanceKind.BUYER,
          amountCents: refund.amountCents,
          balanceAfter: account.balanceCents,
          description: `Wallet refund for ${refund.order.orderNumber}`,
          reference: refund.id,
          orderId: refund.orderId,
          relatedId: refund.id,
        },
      });
    }
  });
  if (fullRefund) await reverseSellerEarningsForOrder(refund.orderId);
  return prisma.refund.findUnique({ where: { id: refund.id } });
}

import { prisma } from "../lib/prisma.js";

export async function searchKb(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const articles = await prisma.kbArticle.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 6,
    orderBy: { viewCount: "desc" },
  });

  return articles;
}

const ORDER_REGEX = /\b(HS-[A-Z0-9]+|TK-[A-Z0-9]+|NEXUS-[A-Z0-9]+)\b/gi;
const TX_REGEX = /\b(0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64})\b/g;

export async function generateAiReply(message: string, userId?: string) {
  // Check for order/tx/withdraw lookup
  const orderMatch = message.match(ORDER_REGEX);
  const txMatch = message.match(TX_REGEX);

  const context: any = {};

  if (orderMatch && userId) {
    const ref = orderMatch[0].toUpperCase();
    const order = await prisma.order.findFirst({
      where: { OR: [{ orderNumber: ref }, { invoiceNumber: ref }] },
      include: { payment: true, items: true },
    });
    if (order) {
      context.order = {
        orderNumber: order.orderNumber,
        status: order.status,
        total: `$${(order.totalCents / 100).toFixed(2)}`,
        paymentStatus: order.payment?.status,
      };
    }

    const topup = await prisma.topupRequest.findFirst({
      where: { reference: ref },
    });
    if (topup) {
      context.topup = {
        reference: topup.reference,
        status: topup.status,
        amount: `$${(topup.amountCents / 100).toFixed(2)}`,
      };
    }
  }

  if (txMatch && userId) {
    const txHash = txMatch[0];
    const topup = await prisma.topupRequest.findFirst({ where: { txHash } });
    if (topup) {
      context.topup = {
        reference: topup.reference,
        status: topup.status,
        amount: `$${(topup.amountCents / 100).toFixed(2)}`,
      };
    }
  }

  // Search KB
  const kbResults = await searchKb(message);

  // Generate reply
  let reply = "";
  if (context.order) {
    reply += `I found your order ${context.order.orderNumber}. Status: ${context.order.status}, Total: ${context.order.total}, Payment: ${context.order.paymentStatus}.\n\n`;
  }
  if (context.topup) {
    reply += `Your deposit ${context.topup.reference} for ${context.topup.amount} is currently ${context.topup.status}.\n\n`;
  }
  if (kbResults.length > 0) {
    reply += `Here's what I found that might help:\n\n`;
    for (const article of kbResults.slice(0, 3)) {
      reply += `📄 ${article.title}\n${article.excerpt ?? article.content.slice(0, 200)}\n\n`;
    }
  }
  if (!reply) {
    reply = `I'm here to help! I can assist with escrow protection, digital delivery, deposits, withdrawals, seller applications, and disputes. You can also paste an order number (e.g., HS-XXXX) or transaction hash for a quick lookup. What can I help you with?`;
  }

  // Quick actions
  const quickActions = [
    "Regenerate download links",
    "Re-verify deposit",
    "Confirm withdrawal address",
  ];

  return { reply, quickActions, kbResults, context };
}

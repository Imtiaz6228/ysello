import { Role, WalletBalanceKind } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";

function payoutReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export const withdrawalNetworks = [
  "USDT TRC20",
  "USDT BEP20",
  "USDT ERC20",
  "Bitcoin",
  "Ethereum",
] as const;

function validateWithdrawalDestination(blockchain: string, rawAddress: string) {
  const walletAddress = rawAddress.trim();
  const valid =
    blockchain === "USDT TRC20"
      ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(walletAddress)
      : ["USDT BEP20", "USDT ERC20", "Ethereum"].includes(blockchain)
        ? /^0x[a-fA-F0-9]{40}$/.test(walletAddress)
        : /^(?:bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(
            walletAddress,
          );
  if (!valid) {
    throw new ApiError(
      400,
      `Enter a valid ${blockchain} receiving address.`,
      "WITHDRAWAL_ADDRESS_INVALID",
    );
  }
  return walletAddress;
}

export function sellerFundsAvailableAt(from = new Date()) {
  return new Date(from.getTime() + env.FROZEN_HOLD_HOURS * 60 * 60 * 1000);
}

export async function releaseAvailableSellerEarnings(userId?: string) {
  const where: any = { status: "FROZEN", availableAt: { lte: new Date() } };
  if (userId) where.sellerId = userId;
  const earnings = await (prisma as any).sellerEarning.findMany({
    where,
    select: { id: true, sellerId: true, netCents: true },
  });
  if (!earnings.length) return { releasedCount: 0, releasedCents: 0 };

  const released = await prisma.$transaction(async (tx) => {
    const bySeller = new Map<string, { cents: number; count: number }>();
    for (const earning of earnings) {
      const claimed = await (tx as any).sellerEarning.updateMany({
        where: { id: earning.id, status: "FROZEN" },
        data: { status: "AVAILABLE", releasedAt: new Date() },
      });
      if (claimed.count !== 1) continue;
      const current = bySeller.get(earning.sellerId) ?? { cents: 0, count: 0 };
      current.cents += earning.netCents;
      current.count += 1;
      bySeller.set(earning.sellerId, current);
    }
    for (const [sellerId, releasedForSeller] of bySeller.entries()) {
      const account = await tx.user.update({
        where: { id: sellerId },
        data: {
          sellerBalanceCents: { increment: releasedForSeller.cents },
        },
        select: { sellerBalanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId: sellerId,
          type: "FROZEN_RELEASE",
          balanceKind: WalletBalanceKind.SELLER,
          amountCents: releasedForSeller.cents,
          balanceAfter: account.sellerBalanceCents,
          description: `${releasedForSeller.count} sale earning${releasedForSeller.count === 1 ? "" : "s"} released after ${env.FROZEN_HOLD_HOURS} hours`,
        },
      });
    }
    return [...bySeller.values()].reduce(
      (summary, item) => ({
        count: summary.count + item.count,
        cents: summary.cents + item.cents,
      }),
      { count: 0, cents: 0 },
    );
  });

  return {
    releasedCount: released.count,
    releasedCents: released.cents,
  };
}

export async function createSellerEarningsForOrderItems(
  tx: any,
  orderId: string,
  paidTotalCents: number,
  items: Array<{ id: string; sellerId: string; totalCents: number }>,
  paidAt: Date,
) {
  const availableAt = sellerFundsAvailableAt(paidAt);
  const itemSubtotalCents = items.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );
  let allocatedCents = 0;
  for (const [index, item] of items.entries()) {
    const grossCents =
      index === items.length - 1
        ? Math.max(0, paidTotalCents - allocatedCents)
        : Math.max(
            0,
            Math.min(
              paidTotalCents - allocatedCents,
              Math.round(
                (paidTotalCents * item.totalCents) /
                  Math.max(1, itemSubtotalCents),
              ),
            ),
          );
    allocatedCents += grossCents;
    const platformFeeCents = Math.round(
      (grossCents * env.COMMISSION_SALE_PERCENT) / 100,
    );
    const netCents = grossCents - platformFeeCents;
    await tx.sellerEarning.upsert({
      where: { orderItemId: item.id },
      create: {
        sellerId: item.sellerId,
        orderItemId: item.id,
        grossCents,
        platformFeeCents,
        netCents,
        status: "FROZEN",
        availableAt,
      },
      update: {},
    });
    await tx.adminTransaction.upsert({
      where: {
        type_reference: { type: "COMMISSION_SALE", reference: item.id },
      },
      create: {
        type: "COMMISSION_SALE",
        amountCents: platformFeeCents,
        description: `${env.COMMISSION_SALE_PERCENT}% marketplace fee`,
        reference: item.id,
        orderId,
      },
      update: {},
    });
  }
}

export async function reverseSellerEarningsForOrder(orderId: string) {
  const earnings = await (prisma as any).sellerEarning.findMany({
    where: { orderItem: { orderId }, status: { in: ["FROZEN", "AVAILABLE"] } },
    select: { id: true, sellerId: true, netCents: true, status: true },
  });
  if (!earnings.length) return;
  await prisma.$transaction(async (tx) => {
    for (const earning of earnings) {
      if (earning.status === "AVAILABLE") {
        const account = await tx.user.update({
          where: { id: earning.sellerId },
          data: {
            sellerBalanceCents: { decrement: earning.netCents },
          },
          select: { sellerBalanceCents: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: earning.sellerId,
            type: "REFUND",
            balanceKind: WalletBalanceKind.SELLER,
            amountCents: -earning.netCents,
            balanceAfter: account.sellerBalanceCents,
            description: "Seller earning reversed after buyer refund",
            orderId,
            relatedId: earning.id,
          },
        });
      }
      await (tx as any).sellerEarning.update({
        where: { id: earning.id },
        data: { status: "REFUNDED" },
      });
    }
  });
}

export async function getWalletSummary(userId: string) {
  await releaseAvailableSellerEarnings(userId);
  const [user, frozen, pendingWithdrawals, withdrawals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balanceCents: true, sellerBalanceCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId: userId, status: "FROZEN" },
      _sum: { netCents: true },
    }),
    (prisma as any).withdrawalRequest.aggregate({
      where: { userId, status: "PENDING" },
      _sum: { amountCents: true },
    }),
    (prisma as any).withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    balanceCents: user?.balanceCents ?? 0,
    availableBalanceCents: user?.balanceCents ?? 0,
    sellerAvailableBalanceCents: user?.sellerBalanceCents ?? 0,
    frozenSellerBalanceCents: frozen._sum.netCents ?? 0,
    pendingWithdrawalCents: pendingWithdrawals._sum.amountCents ?? 0,
    withdrawals,
  };
}

export async function getSellerFinanceSummary(sellerId: string) {
  await releaseAvailableSellerEarnings(sellerId);
  const [
    wallet,
    frozen,
    availableEarnings,
    totalEarnings,
    withdrawals,
    todayEarnings,
    todayOrders,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { sellerBalanceCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: "FROZEN" },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: "AVAILABLE" },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: { sellerId, status: { in: ["FROZEN", "AVAILABLE", "WITHDRAWN"] } },
      _sum: { netCents: true },
      _count: true,
    }),
    (prisma as any).withdrawalRequest.aggregate({
      where: { userId: sellerId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amountCents: true },
    }),
    (prisma as any).sellerEarning.aggregate({
      where: {
        sellerId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { netCents: true },
    }),
    (prisma as any).sellerEarning.count({
      where: {
        sellerId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return {
    availableBalanceCents: wallet?.sellerBalanceCents ?? 0,
    frozenBalanceCents: frozen._sum.netCents ?? 0,
    releasedSellerEarningsCents: availableEarnings._sum.netCents ?? 0,
    totalSellerEarningsCents: totalEarnings._sum.netCents ?? 0,
    totalSellerEarningCount: totalEarnings._count ?? 0,
    withdrawnCents: withdrawals._sum.amountCents ?? 0,
    todayIncomeCents: todayEarnings._sum.netCents ?? 0,
    todayOrderCount: todayOrders,
  };
}

export async function createWithdrawalRequest(
  userId: string,
  input: { amountCents: number; blockchain: string; walletAddress: string },
) {
  const walletAddress = validateWithdrawalDestination(
    input.blockchain,
    input.walletAddress,
  );
  await releaseAvailableSellerEarnings(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sellerBalanceCents: true, role: true },
  });
  if (!user) throw new ApiError(404, "User not found.", "USER_NOT_FOUND");
  if (user.role !== Role.SELLER) {
    throw new ApiError(
      403,
      "Only approved seller earnings can be withdrawn.",
      "SELLER_WITHDRAWAL_REQUIRED",
    );
  }
  if (input.amountCents < 500)
    throw new ApiError(
      400,
      "Minimum withdrawal is $5.00.",
      "WITHDRAWAL_MINIMUM",
    );
  if (user.sellerBalanceCents < input.amountCents)
    throw new ApiError(
      402,
      "Insufficient available balance for this withdrawal.",
      "INSUFFICIENT_FUNDS",
    );

  const request = await prisma.$transaction(async (tx) => {
    const debited = await tx.user.updateMany({
      where: {
        id: userId,
        role: Role.SELLER,
        sellerBalanceCents: { gte: input.amountCents },
      },
      data: {
        sellerBalanceCents: { decrement: input.amountCents },
      },
    });
    if (debited.count !== 1) {
      throw new ApiError(
        409,
        "Your available seller balance changed. Refresh and try again.",
        "INSUFFICIENT_FUNDS",
      );
    }
    const account = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { sellerBalanceCents: true },
    });
    const withdrawal = await (tx as any).withdrawalRequest.create({
      data: {
        userId,
        amountCents: input.amountCents,
        blockchain: input.blockchain,
        walletAddress,
        status: "PENDING",
        providerReference: payoutReference("WD"),
      },
    });
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "WITHDRAWAL",
        balanceKind: WalletBalanceKind.SELLER,
        amountCents: -input.amountCents,
        balanceAfter: account.sellerBalanceCents,
        description: `Seller withdrawal requested on ${input.blockchain}`,
        reference: withdrawal.providerReference,
        relatedId: withdrawal.id,
      },
    });
    return withdrawal;
  });
  return request;
}

export async function reviewWithdrawalRequest(
  id: string,
  action: "approve" | "reject",
  adminId: string,
  adminNotes?: string,
) {
  return prisma.$transaction(async (tx) => {
    const request = await (tx as any).withdrawalRequest.findUnique({
      where: { id },
    });
    if (!request)
      throw new ApiError(
        404,
        "Withdrawal request not found.",
        "WITHDRAWAL_NOT_FOUND",
      );
    if (request.status !== "PENDING")
      throw new ApiError(
        409,
        "Withdrawal request is no longer pending.",
        "WITHDRAWAL_NOT_PENDING",
      );

    const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const claimed = await (tx as any).withdrawalRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: nextStatus,
        adminNotes:
          adminNotes ??
          (action === "approve"
            ? "Payment sent and approved by admin."
            : "Rejected by admin."),
        reviewedById: adminId,
        processedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError(
        409,
        "This withdrawal was already processed by another administrator.",
        "WITHDRAWAL_NOT_PENDING",
      );
    }

    if (action === "reject") {
      const account = await tx.user.update({
        where: { id: request.userId },
        data: {
          sellerBalanceCents: { increment: request.amountCents },
        },
        select: { sellerBalanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId: request.userId,
          type: "ADJUSTMENT",
          balanceKind: WalletBalanceKind.SELLER,
          amountCents: request.amountCents,
          balanceAfter: account.sellerBalanceCents,
          description: "Rejected withdrawal returned to seller balance",
          reference: request.providerReference,
          relatedId: request.id,
        },
      });
    }
    return (tx as any).withdrawalRequest.findUniqueOrThrow({ where: { id } });
  });
}

import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export type Granularity = "daily" | "weekly" | "monthly";

export type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

export type BreakdownRow = {
  date: string;
  label: string;
  orders: number;
  saleCommissionCents: number;
  withdrawCommissionCents: number;
  totalAdminCents: number;
  withdrawCount: number;
  withdrawVolumeCents: number;
  netIncomeCents: number;
};

export type TopProductRow = {
  productId: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
  orders: number;
  avgPriceCents: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  contributionPct: number;
};

export type AdminSummary = {
  totalOrders: number;
  totalGrossCents: number;
  totalSaleCommissionCents: number;
  totalWithdrawCommissionCents: number;
  totalAdminCents: number;
  totalWithdrawVolumeCents: number;
  totalWithdrawCount: number;
  netIncomeCents: number;
};

export type SellerSummary = {
  totalOrders: number;
  totalGrossCents: number;
  totalCommissionCents: number;
  totalNetCents: number;
  availableCents: number;
  frozenCents: number;
  heldCents: number;
  finalNetAfterWithdrawCents: number;
};

export type EarningsReport = {
  ranges: DateRange[];
  breakdown: BreakdownRow[];
  topProducts: TopProductRow[];
  summary: AdminSummary | SellerSummary;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatLabel(date: Date, granularity: Granularity): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (granularity === "daily") {
    return `${mm}/${dd}`;
  }
  if (granularity === "weekly") {
    return `W${mm}/${dd}`;
  }
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
}

export function getDateRanges(
  from: Date,
  to: Date,
  granularity: Granularity,
): DateRange[] {
  const ranges: DateRange[] = [];
  let current = new Date(from);
  const end = new Date(to);

  while (current <= end) {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (granularity === "daily") {
      rangeStart = startOfDay(current);
      rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      current = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
    } else if (granularity === "weekly") {
      rangeStart = startOfWeek(current);
      rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      current = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      rangeStart = startOfMonth(current);
      const nextMonth = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1,
      );
      rangeEnd = new Date(nextMonth.getTime() - 1);
      current = nextMonth;
    }

    if (rangeEnd > end) rangeEnd = new Date(end);
    ranges.push({
      start: rangeStart,
      end: rangeEnd,
      label: formatLabel(rangeStart, granularity),
    });
  }

  return ranges;
}

export class EarningsAnalyticsService {
  async getAdminReport(
    from: Date,
    to: Date,
    granularity: Granularity,
  ): Promise<EarningsReport> {
    const ranges = getDateRanges(from, to, granularity);

    const breakdown = await Promise.all(
      ranges.map(async (range) => this.getBreakdownRow(range)),
    );

    const topProducts = await this.getTopProducts(from, to);
    const summary = await this.getAdminSummary(from, to);

    return { ranges, breakdown, topProducts, summary };
  }

  async getSellerReport(
    sellerId: string,
    from: Date,
    to: Date,
    granularity: Granularity,
  ): Promise<EarningsReport> {
    const ranges = getDateRanges(from, to, granularity);

    const breakdown = await Promise.all(
      ranges.map(async (range) => this.getSellerBreakdownRow(sellerId, range)),
    );

    const topProducts = await this.getSellerTopProducts(sellerId, from, to);
    const summary = await this.getSellerSummary(sellerId, from, to);

    return { ranges, breakdown, topProducts, summary };
  }

  private async getBreakdownRow(range: DateRange): Promise<BreakdownRow> {
    const [orders, saleCommission, withdrawCommission, withdrawals] =
      await Promise.all([
        prisma.order.count({
          where: {
            paidAt: { gte: range.start, lte: range.end },
            status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
          },
        }),
        prisma.adminTransaction.aggregate({
          where: {
            type: "COMMISSION_SALE",
            createdAt: { gte: range.start, lte: range.end },
          },
          _sum: { amountCents: true },
          _count: true,
        }),
        prisma.adminTransaction.aggregate({
          where: {
            type: "COMMISSION_WITHDRAW",
            createdAt: { gte: range.start, lte: range.end },
          },
          _sum: { amountCents: true },
          _count: true,
        }),
        (prisma as any).withdrawalRequest.aggregate({
          where: {
            status: "APPROVED",
            createdAt: { gte: range.start, lte: range.end },
          },
          _sum: { amountCents: true },
          _count: true,
        }),
      ]);

    const saleCommissionCents = saleCommission._sum.amountCents ?? 0;
    const withdrawCommissionCents = withdrawCommission._sum.amountCents ?? 0;
    const totalAdminCents = saleCommissionCents + withdrawCommissionCents;
    const withdrawVolumeCents = withdrawals._sum.amountCents ?? 0;
    const withdrawCount = withdrawals._count ?? 0;
    const netIncomeCents = totalAdminCents;

    return {
      date: range.start.toISOString(),
      label: range.label,
      orders,
      saleCommissionCents,
      withdrawCommissionCents,
      totalAdminCents,
      withdrawCount,
      withdrawVolumeCents,
      netIncomeCents,
    };
  }

  private async getSellerBreakdownRow(
    sellerId: string,
    range: DateRange,
  ): Promise<BreakdownRow> {
    const [orderItems, earnings, withdrawals] = await Promise.all([
      prisma.orderItem.count({
        where: {
          sellerId,
          order: { paidAt: { gte: range.start, lte: range.end } },
        },
      }),
      (prisma as any).sellerEarning.aggregate({
        where: { sellerId, createdAt: { gte: range.start, lte: range.end } },
        _sum: { grossCents: true, platformFeeCents: true, netCents: true },
        _count: true,
      }),
      (prisma as any).withdrawalRequest.aggregate({
        where: {
          userId: sellerId,
          status: "APPROVED",
          createdAt: { gte: range.start, lte: range.end },
        },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const grossCents = earnings._sum.grossCents ?? 0;
    const commissionCents = earnings._sum.platformFeeCents ?? 0;
    const netCents = earnings._sum.netCents ?? 0;
    const withdrawVolumeCents = withdrawals._sum.amountCents ?? 0;
    const withdrawCount = withdrawals._count ?? 0;

    return {
      date: range.start.toISOString(),
      label: range.label,
      orders: orderItems,
      saleCommissionCents: grossCents,
      withdrawCommissionCents: commissionCents,
      totalAdminCents: netCents,
      withdrawCount,
      withdrawVolumeCents,
      netIncomeCents: netCents,
    };
  }

  private async getTopProducts(from: Date, to: Date): Promise<TopProductRow[]> {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          paidAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            coverImageUrl: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const grouped = new Map<
      string,
      { product: any; orders: number; grossCents: number }
    >();
    for (const item of orderItems) {
      const existing = grouped.get(item.productId) ?? {
        product: item.product,
        orders: 0,
        grossCents: 0,
      };
      existing.orders += item.quantity;
      existing.grossCents += item.totalCents;
      grouped.set(item.productId, existing);
    }

    const totalGross =
      [...grouped.values()].reduce((sum, g) => sum + g.grossCents, 0) || 1;
    const rows = [...grouped.values()]
      .map((g) => ({
        productId: g.product.id,
        title: g.product.name,
        category: g.product.category?.name ?? "Uncategorized",
        coverImageUrl: g.product.coverImageUrl ?? null,
        orders: g.orders,
        avgPriceCents: g.orders > 0 ? Math.round(g.grossCents / g.orders) : 0,
        grossCents: g.grossCents,
        commissionCents: Math.round(
          (g.grossCents * env.COMMISSION_SALE_PERCENT) / 100,
        ),
        netCents: Math.round(
          (g.grossCents * (100 - env.COMMISSION_SALE_PERCENT)) / 100,
        ),
        contributionPct: Math.round((g.grossCents / totalGross) * 1000) / 10,
      }))
      .sort((a, b) => b.grossCents - a.grossCents)
      .slice(0, 20);

    return rows;
  }

  private async getSellerTopProducts(
    sellerId: string,
    from: Date,
    to: Date,
  ): Promise<TopProductRow[]> {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        sellerId,
        order: {
          paidAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            coverImageUrl: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const grouped = new Map<
      string,
      { product: any; orders: number; grossCents: number }
    >();
    for (const item of orderItems) {
      const existing = grouped.get(item.productId) ?? {
        product: item.product,
        orders: 0,
        grossCents: 0,
      };
      existing.orders += item.quantity;
      existing.grossCents += item.totalCents;
      grouped.set(item.productId, existing);
    }

    const totalGross =
      [...grouped.values()].reduce((sum, g) => sum + g.grossCents, 0) || 1;
    const rows = [...grouped.values()]
      .map((g) => ({
        productId: g.product.id,
        title: g.product.name,
        category: g.product.category?.name ?? "Uncategorized",
        coverImageUrl: g.product.coverImageUrl ?? null,
        orders: g.orders,
        avgPriceCents: g.orders > 0 ? Math.round(g.grossCents / g.orders) : 0,
        grossCents: g.grossCents,
        commissionCents: Math.round(
          (g.grossCents * env.COMMISSION_SALE_PERCENT) / 100,
        ),
        netCents: Math.round(
          (g.grossCents * (100 - env.COMMISSION_SALE_PERCENT)) / 100,
        ),
        contributionPct: Math.round((g.grossCents / totalGross) * 1000) / 10,
      }))
      .sort((a, b) => b.grossCents - a.grossCents)
      .slice(0, 20);

    return rows;
  }

  private async getAdminSummary(from: Date, to: Date): Promise<AdminSummary> {
    const [
      orderCount,
      orderGross,
      saleCommission,
      withdrawCommission,
      withdrawals,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          paidAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
        },
      }),
      prisma.order.aggregate({
        where: {
          paidAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
        },
        _sum: { totalCents: true },
      }),
      prisma.adminTransaction.aggregate({
        where: { type: "COMMISSION_SALE", createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
      }),
      prisma.adminTransaction.aggregate({
        where: {
          type: "COMMISSION_WITHDRAW",
          createdAt: { gte: from, lte: to },
        },
        _sum: { amountCents: true },
      }),
      (prisma as any).withdrawalRequest.aggregate({
        where: { status: "APPROVED", createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const totalSaleCommissionCents = saleCommission._sum.amountCents ?? 0;
    const totalWithdrawCommissionCents =
      withdrawCommission._sum.amountCents ?? 0;

    return {
      totalOrders: orderCount,
      totalGrossCents: orderGross._sum.totalCents ?? 0,
      totalSaleCommissionCents,
      totalWithdrawCommissionCents,
      totalAdminCents: totalSaleCommissionCents + totalWithdrawCommissionCents,
      totalWithdrawVolumeCents: withdrawals._sum.amountCents ?? 0,
      totalWithdrawCount: withdrawals._count ?? 0,
      netIncomeCents: totalSaleCommissionCents + totalWithdrawCommissionCents,
    };
  }

  private async getSellerSummary(
    sellerId: string,
    from: Date,
    to: Date,
  ): Promise<SellerSummary> {
    const [orderItems, earnings, available, frozen, held, withdrawals] =
      await Promise.all([
        prisma.orderItem.count({
          where: {
            sellerId,
            order: {
              paidAt: { gte: from, lte: to },
              status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
            },
          },
        }),
        (prisma as any).sellerEarning.aggregate({
          where: { sellerId, createdAt: { gte: from, lte: to } },
          _sum: { grossCents: true, platformFeeCents: true, netCents: true },
        }),
        (prisma as any).sellerEarning.aggregate({
          where: { sellerId, status: "AVAILABLE" },
          _sum: { netCents: true },
        }),
        (prisma as any).sellerEarning.aggregate({
          where: { sellerId, status: "FROZEN" },
          _sum: { netCents: true },
        }),
        (prisma as any).withdrawalRequest.aggregate({
          where: { userId: sellerId, status: "PENDING" },
          _sum: { amountCents: true },
        }),
        (prisma as any).withdrawalRequest.aggregate({
          where: {
            userId: sellerId,
            status: "APPROVED",
            createdAt: { gte: from, lte: to },
          },
          _sum: { amountCents: true },
        }),
      ]);

    const totalGrossCents = earnings._sum.grossCents ?? 0;
    const totalCommissionCents = earnings._sum.platformFeeCents ?? 0;
    const totalNetCents = earnings._sum.netCents ?? 0;
    const withdrawVolume = withdrawals._sum.amountCents ?? 0;
    const withdrawCommission = Math.round(
      (withdrawVolume * env.COMMISSION_WITHDRAW_PERCENT) / 100,
    );

    return {
      totalOrders: orderItems,
      totalGrossCents,
      totalCommissionCents,
      totalNetCents,
      availableCents: available._sum.netCents ?? 0,
      frozenCents: frozen._sum.netCents ?? 0,
      heldCents: held._sum.amountCents ?? 0,
      finalNetAfterWithdrawCents: totalNetCents - withdrawCommission,
    };
  }
}

export const earningsAnalyticsService = new EarningsAnalyticsService();

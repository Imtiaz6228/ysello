import {
  Prisma,
  TopupMethod,
  TopupStatus,
  WalletBalanceKind,
} from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

const TOPUP_EXPIRY_HOURS = 24;

const topupAddressBook: Partial<
  Record<
    TopupMethod,
    { label: string; network: string; asset: string; address: string }
  >
> = {
  CRYPTO_TRC20: {
    label: "USDT · TRC20",
    network: "Tron (TRC20)",
    asset: "USDT",
    address: env.TOPUP_TRC20_ADDRESS ?? "",
  },
  CRYPTO_BEP20: {
    label: "USDT · BEP20",
    network: "BNB Smart Chain (BEP20)",
    asset: "USDT",
    address: env.TOPUP_BEP20_ADDRESS ?? "",
  },
  CRYPTO_ERC20: {
    label: "USDT · ERC20",
    network: "Ethereum (ERC20)",
    asset: "USDT",
    address: env.TOPUP_ERC20_ADDRESS ?? "",
  },
  BTC: {
    label: "Bitcoin",
    network: "Bitcoin",
    asset: "BTC",
    address: env.TOPUP_BTC_ADDRESS ?? "",
  },
  ETH: {
    label: "Ethereum",
    network: "Ethereum",
    asset: "ETH",
    address: env.TOPUP_ETH_ADDRESS ?? "",
  },
};

function generateReference() {
  return `HS-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function getDepositAddress(method: TopupMethod): string {
  // Network-specific destinations are intentionally explicit: never reuse a
  // generic crypto address label, because buyers must send on the exact chain.
  const address = topupAddressBook[method]?.address;
  if (!address)
    throw new ApiError(
      503,
      "This top-up network is not configured.",
      "TOPUP_METHOD_UNAVAILABLE",
    );
  return address;
}

export function getTopupMethods() {
  return Object.entries(topupAddressBook)
    .filter(([, details]) => Boolean(details?.address))
    .map(([method, details]) => ({
      method: method as TopupMethod,
      ...details!,
      feePolicy: "Network and exchange fees are paid by the buyer.",
      amountPolicy:
        details!.asset === "USDT"
          ? "Send the exact USDT amount shown."
          : "Send the USD-equivalent crypto value shown at payment time.",
    }));
}

export async function createTopupRequest(
  userId: string,
  amountCents: number,
  method: TopupMethod,
) {
  if (amountCents < 100 || amountCents > 10_000_000) {
    throw new ApiError(
      400,
      "Amount must be between $1.00 and $100,000.00.",
      "TOPUP_AMOUNT_INVALID",
    );
  }

  const reference = generateReference();
  const depositAddress = getDepositAddress(method);
  const expiresAt = new Date(Date.now() + TOPUP_EXPIRY_HOURS * 60 * 60 * 1000);

  const topup = await prisma.topupRequest.create({
    data: {
      userId,
      amountCents,
      method,
      status: TopupStatus.PENDING,
      depositAddress,
      reference,
      expiresAt,
    },
  });

  return {
    topup,
    instructions: getTopupInstructions(topup),
  };
}

function getTopupInstructions(topup: any): string {
  const amount = `$${(topup.amountCents / 100).toFixed(2)}`;
  const methodLabel = topup.method.replace(/_/g, " ");
  const stablecoinMethods = new Set<TopupMethod>([
    TopupMethod.CRYPTO_TRC20,
    TopupMethod.CRYPTO_BEP20,
    TopupMethod.CRYPTO_ERC20,
  ]);
  const stablecoin = stablecoinMethods.has(topup.method);
  return `${stablecoin ? `Send exactly ${amount} in USDT` : `Send crypto worth ${amount}`} via ${methodLabel} to the displayed address. Network and exchange fees are paid by the buyer. After sending, submit the TXID and a screenshot that visibly contains the same TXID. Never send on another network. Funds are credited only after admin approval.`;
}

function normalizeTxHash(method: TopupMethod, raw: string) {
  const txHash = raw.trim().toLowerCase();
  const evmMethods = new Set<TopupMethod>([
    TopupMethod.CRYPTO_BEP20,
    TopupMethod.CRYPTO_ERC20,
    TopupMethod.ETH,
  ]);
  const evmMethod = evmMethods.has(method);
  const valid = evmMethod
    ? /^0x[a-f0-9]{64}$/.test(txHash)
    : /^[a-f0-9]{64}$/.test(txHash);
  if (!valid) {
    throw new ApiError(
      400,
      evmMethod
        ? "Enter the complete 0x transaction hash for the selected EVM network."
        : "Enter the complete 64-character transaction ID for the selected network.",
      "TOPUP_TXID_INVALID",
    );
  }
  return txHash;
}

export async function submitTopupProof(
  userId: string,
  topupId: string,
  txHash: string,
  screenshotPath?: string,
  screenshotUrl?: string,
) {
  const topup = await prisma.topupRequest.findFirst({
    where: { id: topupId, userId },
  });
  if (!topup)
    throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
  if (topup.status !== TopupStatus.PENDING) {
    throw new ApiError(
      400,
      "This topup request is already processed.",
      "TOPUP_ALREADY_PROCESSED",
    );
  }
  if (topup.expiresAt <= new Date()) {
    await prisma.topupRequest.updateMany({
      where: { id: topup.id, status: TopupStatus.PENDING, txHash: null },
      data: { status: TopupStatus.EXPIRED },
    });
    throw new ApiError(
      410,
      "This payment request has expired. Create a new top-up request before sending funds.",
      "TOPUP_EXPIRED",
    );
  }
  if (topup.txHash || topup.proofSubmittedAt) {
    throw new ApiError(
      409,
      "Payment proof has already been submitted and is pending admin review.",
      "TOPUP_PROOF_ALREADY_SUBMITTED",
    );
  }
  if (!screenshotPath || !screenshotUrl) {
    throw new ApiError(
      400,
      "Upload a payment screenshot that contains the transaction ID.",
      "TOPUP_SCREENSHOT_REQUIRED",
    );
  }

  const normalizedTxHash = normalizeTxHash(topup.method, txHash);
  try {
    const submitted = await prisma.topupRequest.updateMany({
      where: {
        id: topupId,
        userId,
        status: TopupStatus.PENDING,
        txHash: null,
        proofSubmittedAt: null,
      },
      data: {
        txHash: normalizedTxHash,
        screenshotPath,
        screenshotUrl,
        proofSubmittedAt: new Date(),
        status: TopupStatus.PENDING,
      },
    });
    if (submitted.count !== 1) {
      throw new ApiError(
        409,
        "Payment proof has already been submitted and is pending admin review.",
        "TOPUP_PROOF_ALREADY_SUBMITTED",
      );
    }
    const updated = await prisma.topupRequest.findUniqueOrThrow({
      where: { id: topupId },
    });

    const verified = await autoVerifyTopup(updated);
    return {
      topup: verified,
      autoVerified: verified.status === TopupStatus.VERIFIED,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "This transaction ID has already been submitted. One blockchain transaction can credit only one top-up.",
        "TOPUP_TXID_DUPLICATE",
      );
    }
    throw error;
  }
}

async function autoVerifyTopup(topup: any): Promise<any> {
  // Keep deposits in manual review until recipient, asset/contract, amount,
  // confirmations, success, and transaction-hash uniqueness are all verified.
  return topup;
}

export async function approveTopup(
  topupId: string,
  adminId: string,
  adminNotes?: string,
) {
  return prisma.$transaction(async (tx) => {
    const topup = await tx.topupRequest.findUnique({
      where: { id: topupId },
    });
    if (!topup)
      throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
    if (topup.status === TopupStatus.APPROVED)
      throw new ApiError(
        409,
        "Top-up already approved.",
        "TOPUP_ALREADY_APPROVED",
      );
    if (topup.status === TopupStatus.REJECTED)
      throw new ApiError(
        409,
        "Top-up already rejected.",
        "TOPUP_ALREADY_REJECTED",
      );
    if (!topup.txHash || !topup.screenshotUrl || !topup.proofSubmittedAt) {
      throw new ApiError(
        400,
        "TXID and screenshot proof are required before approval.",
        "TOPUP_PROOF_REQUIRED",
      );
    }

    const claimed = await tx.topupRequest.updateMany({
      where: {
        id: topupId,
        status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] },
        txHash: { not: null },
        proofSubmittedAt: { not: null },
      },
      data: {
        status: TopupStatus.APPROVED,
        networkVerified: true,
        approvedById: adminId,
        approvedAt: new Date(),
        adminNotes:
          adminNotes ??
          "TXID, amount, network, receiving address, and screenshot approved by admin.",
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError(
        409,
        "This top-up was already processed by another administrator.",
        "TOPUP_ALREADY_PROCESSED",
      );
    }

    const account = await tx.user.update({
      where: { id: topup.userId },
      data: { balanceCents: { increment: topup.amountCents } },
      select: { balanceCents: true },
    });
    await tx.walletTransaction.create({
      data: {
        userId: topup.userId,
        type: "TOPUP",
        balanceKind: WalletBalanceKind.BUYER,
        amountCents: topup.amountCents,
        balanceAfter: account.balanceCents,
        description: `Approved top-up via ${topup.method.replace(/_/g, " ")}`,
        reference: topup.txHash,
        relatedId: topup.id,
      },
    });
    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  });
}

export async function rejectTopup(topupId: string, adminNotes?: string) {
  return prisma.$transaction(async (tx) => {
    const topup = await tx.topupRequest.findUnique({
      where: { id: topupId },
    });
    if (!topup)
      throw new ApiError(404, "Topup request not found.", "TOPUP_NOT_FOUND");
    if (topup.status === TopupStatus.APPROVED)
      throw new ApiError(
        409,
        "Cannot reject an approved top-up.",
        "TOPUP_ALREADY_APPROVED",
      );
    const rejected = await tx.topupRequest.updateMany({
      where: {
        id: topupId,
        status: { in: [TopupStatus.PENDING, TopupStatus.VERIFIED] },
      },
      data: {
        status: TopupStatus.REJECTED,
        adminNotes: adminNotes ?? "Rejected by admin.",
      },
    });
    if (rejected.count !== 1) {
      throw new ApiError(
        409,
        "This top-up was already processed.",
        "TOPUP_ALREADY_PROCESSED",
      );
    }
    return tx.topupRequest.findUniqueOrThrow({ where: { id: topupId } });
  });
}

export async function getTopupRequests(userId?: string) {
  await prisma.topupRequest.updateMany({
    where: {
      status: TopupStatus.PENDING,
      txHash: null,
      expiresAt: { lt: new Date() },
    },
    data: { status: TopupStatus.EXPIRED },
  });
  const where = userId ? { userId } : undefined;
  return prisma.topupRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          balanceCents: true,
        },
      },
    },
    take: 200,
  });
}

export async function verifyPendingDeposits() {
  const pending = await prisma.topupRequest.findMany({
    where: {
      status: TopupStatus.PENDING,
      txHash: { not: null },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    take: 50,
  });

  let verifiedCount = 0;
  for (const topup of pending) {
    const result = await autoVerifyTopup(topup);
    if (result.status === TopupStatus.VERIFIED) verifiedCount++;
  }

  return { checked: pending.length, verified: verifiedCount };
}

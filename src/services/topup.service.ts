import {
  Prisma,
  TopupMethod,
  TopupStatus,
  WalletBalanceKind,
} from "@prisma/client";
import fs from "node:fs/promises";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

const TOPUP_EXPIRY_HOURS = 24;

const topupResponseSelect = {
  id: true,
  userId: true,
  amountCents: true,
  networkFeeCents: true,
  totalPayableCents: true,
  method: true,
  status: true,
  depositAddress: true,
  reference: true,
  txHash: true,
  screenshotUrl: true,
  proofSubmittedAt: true,
  networkVerified: true,
  adminNotes: true,
  approvedById: true,
  approvedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const topupAddressBook: Partial<
  Record<
    TopupMethod,
    {
      label: string;
      network: string;
      asset: string;
      address: string;
      networkFeeCents: number;
    }
  >
> = {
  CRYPTO_TRC20: {
    label: "USDT · TRC20",
    network: "Tron (TRC20)",
    asset: "USDT",
    address: env.TOPUP_TRC20_ADDRESS ?? "",
    networkFeeCents: env.TOPUP_TRC20_FEE_CENTS,
  },
  CRYPTO_BEP20: {
    label: "USDT · BEP20",
    network: "BNB Smart Chain (BEP20)",
    asset: "USDT",
    address: env.TOPUP_BEP20_ADDRESS ?? "",
    networkFeeCents: env.TOPUP_BEP20_FEE_CENTS,
  },
  CRYPTO_ERC20: {
    label: "USDT · ERC20",
    network: "Ethereum (ERC20)",
    asset: "USDT",
    address: env.TOPUP_ERC20_ADDRESS ?? "",
    networkFeeCents: env.TOPUP_ERC20_FEE_CENTS,
  },
  BTC: {
    label: "Bitcoin",
    network: "Bitcoin",
    asset: "BTC",
    address: env.TOPUP_BTC_ADDRESS ?? "",
    networkFeeCents: env.TOPUP_BTC_FEE_CENTS,
  },
  ETH: {
    label: "Ethereum",
    network: "Ethereum",
    asset: "ETH",
    address: env.TOPUP_ETH_ADDRESS ?? "",
    networkFeeCents: env.TOPUP_ETH_FEE_CENTS,
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
      feePolicy:
        "The buyer pays the wallet/provider network fee separately. The live wallet quote is final.",
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
  const networkFeeCents = topupAddressBook[method]?.networkFeeCents ?? 0;
  const totalPayableCents = amountCents + networkFeeCents;
  const expiresAt = new Date(Date.now() + TOPUP_EXPIRY_HOURS * 60 * 60 * 1000);

  const topup = await prisma.topupRequest.create({
    data: {
      userId,
      amountCents,
      networkFeeCents,
      totalPayableCents,
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
  const fee = `$${(topup.networkFeeCents / 100).toFixed(2)}`;
  const total = `$${(topup.totalPayableCents / 100).toFixed(2)}`;
  const methodLabel = topup.method.replace(/_/g, " ");
  const stablecoinMethods = new Set<TopupMethod>([
    TopupMethod.CRYPTO_TRC20,
    TopupMethod.CRYPTO_BEP20,
    TopupMethod.CRYPTO_ERC20,
  ]);
  const stablecoin = stablecoinMethods.has(topup.method);
  return `${stablecoin ? `Send exactly ${amount} in USDT` : `Send crypto worth ${amount}`} via ${methodLabel} to the displayed address. The estimated wallet/network fee is ${fee}, so the estimated buyer cost is ${total}; the wallet's live quote is final and the fee is paid separately by the buyer. After sending, submit the TXID or explorer URL and a screenshot that visibly contains the same TXID. Never send on another network. Funds are credited only after admin approval.`;
}

function normalizeTxHash(method: TopupMethod, raw: string) {
  const submitted = raw.trim().toLowerCase();
  const evmMethods = new Set<TopupMethod>([
    TopupMethod.CRYPTO_BEP20,
    TopupMethod.CRYPTO_ERC20,
    TopupMethod.ETH,
  ]);
  const evmMethod = evmMethods.has(method);
  const match = submitted.match(/0x[a-f0-9]{64}|[a-f0-9]{64}/);
  let txHash = match?.[0] ?? "";
  if (evmMethod && txHash && !txHash.startsWith("0x")) txHash = `0x${txHash}`;
  if (!evmMethod && txHash.startsWith("0x")) txHash = txHash.slice(2);
  const valid = evmMethod
    ? /^0x[a-f0-9]{64}$/.test(txHash)
    : /^[a-f0-9]{64}$/.test(txHash);
  if (!valid) {
    throw new ApiError(
      400,
      evmMethod
        ? "Enter the complete 0x transaction hash or explorer URL for the selected EVM network."
        : "Enter the complete 64-character transaction ID or explorer URL for the selected network.",
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
  screenshotMimeType?: string,
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
  const screenshotData = await fs.readFile(screenshotPath).catch(() => null);
  if (!screenshotData) {
    throw new ApiError(
      400,
      "The payment screenshot could not be stored. Upload it again.",
      "TOPUP_SCREENSHOT_INVALID",
    );
  }
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
        screenshotData,
        screenshotMimeType: screenshotMimeType ?? "image/jpeg",
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
    const {
      screenshotData: _screenshotData,
      screenshotPath: _screenshotPath,
      screenshotMimeType: _screenshotMimeType,
      ...safeTopup
    } = verified;
    return {
      topup: safeTopup,
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
    return tx.topupRequest.findUniqueOrThrow({
      where: { id: topupId },
      select: topupResponseSelect,
    });
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
    return tx.topupRequest.findUniqueOrThrow({
      where: { id: topupId },
      select: topupResponseSelect,
    });
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
    select: {
      ...topupResponseSelect,
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

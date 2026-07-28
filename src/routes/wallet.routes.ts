import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { Role, TopupMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireRole,
  requireVerifiedUser,
} from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../middleware/error-handler.js";
import { createWalletCheckout } from "../services/payment.service.js";
import {
  createWithdrawalRequest,
  getWalletSummary,
  releaseAvailableSellerEarnings,
  withdrawalNetworks,
} from "../services/finance.service.js";
import {
  discardPrivateUpload,
  privateUploadRoot,
  topupProofUpload,
} from "../middleware/upload.js";
import {
  createTopupRequest,
  getTopupMethods,
  getTopupRequests,
  submitTopupProof,
} from "../services/topup.service.js";

export const walletRouter = Router();

walletRouter.use(requireAuth, requireVerifiedUser);

walletRouter.get(
  "/balance",
  asyncHandler(async (req, res) => {
    const summary = await getWalletSummary(req.auth!.id);
    res.json(summary);
  }),
);

walletRouter.get(
  "/deposits",
  asyncHandler(async (req, res) => {
    const deposits = await getTopupRequests(req.auth!.id);
    res.json({ deposits });
  }),
);

walletRouter.get(
  "/topup-methods",
  asyncHandler(async (_req, res) => {
    res.json({ methods: getTopupMethods() });
  }),
);

walletRouter.get(
  "/withdrawals",
  requireRole(Role.SELLER),
  asyncHandler(async (req, res) => {
    await releaseAvailableSellerEarnings(req.auth!.id);
    const withdrawals = await (prisma as any).withdrawalRequest.findMany({
      where: { userId: req.auth!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ withdrawals });
  }),
);

walletRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.auth!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ transactions });
  }),
);

walletRouter.post(
  "/withdrawals",
  requireRole(Role.SELLER),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        amountCents: z.number().int().min(500).max(100_000_000),
        blockchain: z.enum(withdrawalNetworks),
        walletAddress: z.string().trim().min(12).max(240),
      })
      .parse(req.body);
    const withdrawal = await createWithdrawalRequest(req.auth!.id, input);
    const summary = await getWalletSummary(req.auth!.id);
    res.status(201).json({
      message:
        "Withdrawal request submitted. It will stay pending until admin approves and marks it successful.",
      withdrawal,
      ...summary,
    });
  }),
);

const cryptoTopupSchema = z.object({
  amountCents: z.number().int().min(100).max(10_000_000),
  method: z.enum([
    TopupMethod.CRYPTO_TRC20,
    TopupMethod.CRYPTO_BEP20,
    TopupMethod.CRYPTO_ERC20,
    TopupMethod.BTC,
    TopupMethod.ETH,
  ]),
});

walletRouter.post(
  "/topups",
  asyncHandler(async (req, res) => {
    const input = cryptoTopupSchema.parse(req.body);
    const result = await createTopupRequest(
      req.auth!.id,
      input.amountCents,
      input.method,
    );
    res.status(201).json({
      message:
        "Payment request created. Send the exact amount only on the selected network, then submit the TXID and screenshot.",
      ...result,
    });
  }),
);

walletRouter.post(
  "/topups/:id/proof",
  topupProofUpload.single("screenshot"),
  asyncHandler(async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const input = z
        .object({ txHash: z.string().trim().min(64).max(66) })
        .parse(req.body);
      if (!req.file)
        throw new ApiError(
          400,
          "Upload a payment screenshot as proof.",
          "TOPUP_SCREENSHOT_REQUIRED",
        );
      const result = await submitTopupProof(
        req.auth!.id,
        id,
        input.txHash,
        req.file.path,
        `/api/wallet/topups/${id}/proof-image`,
      );
      res.status(201).json({
        message: result.autoVerified
          ? "Transaction found. It is ready for final approval."
          : "Payment proof submitted. Status: pending admin approval.",
        ...result,
      });
    } catch (error) {
      await discardPrivateUpload(req.file);
      throw error;
    }
  }),
);

walletRouter.get(
  "/topups/:id/proof-image",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const topup = await prisma.topupRequest.findUnique({
      where: { id },
      select: { userId: true, screenshotPath: true },
    });
    const staffRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR];
    if (
      !topup ||
      !topup.screenshotPath ||
      (topup.userId !== req.auth!.id && !staffRoles.includes(req.auth!.role))
    ) {
      throw new ApiError(404, "Payment proof not found.", "PROOF_NOT_FOUND");
    }

    const proofPath = path.resolve(topup.screenshotPath);
    const privateRoot = path.resolve(privateUploadRoot);
    if (!proofPath.startsWith(`${privateRoot}${path.sep}`)) {
      throw new ApiError(404, "Payment proof not found.", "PROOF_NOT_FOUND");
    }
    await fs.promises.access(proofPath, fs.constants.R_OK).catch(() => {
      throw new ApiError(404, "Payment proof not found.", "PROOF_NOT_FOUND");
    });
    res.set({
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    });
    res.sendFile(proofPath);
  }),
);

// Purchase with wallet balance
const walletItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20).default(1),
    }),
  )
  .min(1)
  .max(30);

walletRouter.post(
  "/purchase-cart",
  asyncHandler(async (req, res) => {
    const input = z.object({ items: walletItemsSchema }).parse(req.body);
    const result = await createWalletCheckout(req.auth!.id, input.items);
    res.status(201).json({
      message:
        "Purchase completed with wallet balance. Downloads are ready in your dashboard.",
      ...result,
    });
  }),
);

walletRouter.post(
  "/purchase",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20).default(1),
      })
      .parse(req.body);

    const result = await createWalletCheckout(req.auth!.id, [
      { productId: input.productId, quantity: input.quantity },
    ]);
    res.status(201).json({
      message:
        "Purchase completed with wallet balance. Downloads are ready in your dashboard.",
      ...result,
    });
  }),
);

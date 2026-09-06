import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import {
  shop2TopupClient,
  shop2TopupStatus,
} from "../services/shop2topup.service.js";

export const shop2TopupRouter = Router();
shop2TopupRouter.use(requireAuth, requireRole(Role.ADMIN, Role.SUPER_ADMIN));
shop2TopupRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const positiveId = z.coerce.number().int().positive();

shop2TopupRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json(await shop2TopupStatus());
  }),
);

shop2TopupRouter.post(
  "/test",
  asyncHandler(async (_req, res) => {
    const account = await shop2TopupClient().getAccount();
    res.json({
      ok: true,
      account: {
        id: account.id,
        username: account.username,
        wallet: account.wallet,
        enabled: account.enabled,
        verified: account.verified,
      },
    });
  }),
);

shop2TopupRouter.get(
  "/catalog/big-categories",
  asyncHandler(async (_req, res) => {
    res.json({ bigCategories: await shop2TopupClient().listBigCategories(true) });
  }),
);

shop2TopupRouter.get(
  "/catalog/categories",
  asyncHandler(async (req, res) => {
    const bigCategoryId = req.query.bigCategoryId
      ? positiveId.parse(req.query.bigCategoryId)
      : undefined;
    res.json({
      categories: await shop2TopupClient().listCategories(bigCategoryId, true),
    });
  }),
);

shop2TopupRouter.get(
  "/catalog/subcategories",
  asyncHandler(async (req, res) => {
    const categoryId = req.query.categoryId
      ? positiveId.parse(req.query.categoryId)
      : undefined;
    res.json({
      subcategories: await shop2TopupClient().listSubcategories(categoryId),
    });
  }),
);

shop2TopupRouter.get(
  "/catalog/subcategories/:itemId/price",
  asyncHandler(async (req, res) => {
    const itemId = positiveId.parse(req.params.itemId);
    res.json({ price: await shop2TopupClient().getPrice(itemId) });
  }),
);

shop2TopupRouter.get(
  "/catalog/categories/:categoryId/requirements",
  asyncHandler(async (req, res) => {
    const categoryId = positiveId.parse(req.params.categoryId);
    res.json({ requirements: await shop2TopupClient().getRequirements(categoryId) });
  }),
);

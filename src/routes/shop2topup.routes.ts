import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import {
  shop2TopupClient,
  shop2TopupStatus,
} from "../services/shop2topup.service.js";
import {
  importShop2TopupCategory,
  importShop2TopupProducts,
  listShop2TopupCategoryMappings,
  listShop2TopupImports,
} from "../services/shop2topup-resale.service.js";

export const shop2TopupRouter = Router();
shop2TopupRouter.use(requireAuth, requireRole(Role.ADMIN, Role.SUPER_ADMIN));
shop2TopupRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const positiveId = z.coerce.number().int().positive();

const uuid = z.string().uuid();
const isoDate = z.string().datetime({ offset: true });

shop2TopupRouter.get(
  "/resale",
  asyncHandler(async (_req, res) => {
    const [status, categoryMappings, imports] = await Promise.all([
      shop2TopupStatus(),
      listShop2TopupCategoryMappings(),
      listShop2TopupImports(),
    ]);
    res.json({ status, categoryMappings, imports });
  }),
);

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

shop2TopupRouter.get(
  "/orders/:orderId",
  asyncHandler(async (req, res) => {
    const orderId = uuid.parse(req.params.orderId);
    res.json({ order: await shop2TopupClient().getOrder(orderId) });
  }),
);

shop2TopupRouter.post(
  "/orders/batch",
  asyncHandler(async (req, res) => {
    const input = z.object({ orderIds: z.array(uuid).min(1).max(50) }).parse(req.body);
    res.json(await shop2TopupClient().getOrdersBatch(input.orderIds));
  }),
);

shop2TopupRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const input = z.object({
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
      status: z.enum(["pending", "completed", "refunded", "partial"]).optional(),
      createdAfter: isoDate.optional(),
      createdBefore: isoDate.optional(),
    }).parse(req.query);
    res.json(await shop2TopupClient().listOrders(input));
  }),
);

shop2TopupRouter.post(
  "/resale/categories/import",
  asyncHandler(async (req, res) => {
    const input = z.object({ remoteCategoryId: positiveId }).parse(req.body);
    const result = await importShop2TopupCategory(input.remoteCategoryId);
    res.status(result.imported ? 201 : 200).json(result);
  }),
);

shop2TopupRouter.post(
  "/resale/import",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        remoteCategoryId: positiveId,
        remoteItemIds: z.array(positiveId).min(1).max(50),
        categoryId: z.string().uuid().optional(),
        autoCategory: z.boolean().default(true),
      })
      .refine((value) => value.autoCategory || Boolean(value.categoryId), {
        message: "Choose a destination category or automatic category mapping.",
      })
      .parse(req.body);
    const result = await importShop2TopupProducts({
      ...input,
      adminId: req.auth!.id,
    });
    res.status(201).json(result);
  }),
);

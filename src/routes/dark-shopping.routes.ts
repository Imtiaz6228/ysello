import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import {
  darkShoppingClient,
  darkShoppingConfiguration,
  darkShoppingSupplierStatus,
} from "../services/dark-shopping.service.js";
import {
  importDarkShoppingProducts,
  listDarkShoppingFulfillments,
  listDarkShoppingListings,
  retryDarkShoppingFulfillment,
  syncDarkShoppingListings,
  updateDarkShoppingListing,
} from "../services/dark-shopping-resale.service.js";

export const darkShoppingRouter = Router();

darkShoppingRouter.use(requireAuth, requireRole(Role.ADMIN, Role.SUPER_ADMIN));
darkShoppingRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const positiveInteger = z.coerce.number().int().positive();
const nonNegativeNumber = z.coerce.number().nonnegative();
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}, z.boolean().optional());

const paginationSchema = z.object({
  page: positiveInteger.optional(),
  perPage: z.coerce.number().int().min(1).max(1_000).optional(),
});

const integerList = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values.flatMap((entry) => String(entry).split(","));
}, z.array(positiveInteger).min(1).max(1_000).optional());

const groupFiltersSchema = paginationSchema.extend({
  ids: integerList,
  categoryId: positiveInteger.optional(),
  name: z.string().trim().min(1).max(500).optional(),
});

const productFiltersSchema = paginationSchema.extend({
  ids: integerList,
  name: z.string().trim().min(1).max(5_000).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  categoryId: positiveInteger.optional(),
  groupId: positiveInteger.optional(),
  onlyInStock: optionalBoolean,
  onlyExclusive: optionalBoolean,
  deliveryType: z.enum(["auto", "manual"]).optional(),
  minimumOrderFrom: positiveInteger.optional(),
  minimumOrderTo: positiveInteger.optional(),
  priceFrom: nonNegativeNumber.optional(),
  priceTo: nonNegativeNumber.optional(),
  ratingFrom: z.coerce.number().min(0).max(5).optional(),
  ratingTo: z.coerce.number().min(0).max(5).optional(),
  quantityFrom: z.coerce.number().int().nonnegative().optional(),
  quantityTo: z.coerce.number().int().nonnegative().optional(),
  filterAttributes: z.preprocess(
    (value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    z
      .array(
        z.object({
          id: positiveInteger,
          value: z.union([z.string().max(5_000), z.number(), z.boolean()]),
          filterType: z.enum(["include", "exclude"]),
        }),
      )
      .max(100)
      .optional(),
  ),
});

darkShoppingRouter.get("/configuration", (_req, res) => {
  res.json(darkShoppingConfiguration());
});

darkShoppingRouter.get(
  "/resale",
  asyncHandler(async (_req, res) => {
    const configuration = darkShoppingConfiguration();
    const [listings, fulfillments, supplier] = await Promise.all([
      listDarkShoppingListings(),
      listDarkShoppingFulfillments(),
      darkShoppingSupplierStatus(),
    ]);
    res.json({
      configuration,
      supplierAccess: supplier.access,
      balance: supplier.balance,
      listings,
      fulfillments,
    });
  }),
);

darkShoppingRouter.post(
  "/resale/import",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        remoteProductIds: z.array(positiveInteger).min(1).max(100),
        categoryId: z.string().uuid(),
        marginPercent: z.number().int().min(0).max(500).optional(),
        publish: z.boolean().default(false),
      })
      .parse(req.body);
    const result = await importDarkShoppingProducts({
      ...input,
      adminId: req.auth!.id,
    });
    res.status(201).json(result);
  }),
);

darkShoppingRouter.post(
  "/resale/sync",
  asyncHandler(async (req, res) => {
    const input = z
      .object({ listingId: z.string().uuid().optional() })
      .parse(req.body);
    const result = await syncDarkShoppingListings(input.listingId);
    res.json(result);
  }),
);

darkShoppingRouter.patch(
  "/resale/listings/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z
      .object({
        isEnabled: z.boolean().optional(),
        marginPercent: z.number().int().min(0).max(500).optional(),
      })
      .refine(
        (value) =>
          value.isEnabled !== undefined || value.marginPercent !== undefined,
        "Provide isEnabled or marginPercent.",
      )
      .parse(req.body);
    const listing = await updateDarkShoppingListing(id, input);
    res.json({ listing });
  }),
);

darkShoppingRouter.post(
  "/resale/fulfillments/:id/retry",
  asyncHandler(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const result = await retryDarkShoppingFulfillment(id);
    res.json({ result });
  }),
);

darkShoppingRouter.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const input = paginationSchema.parse(req.query);
    const data = await darkShoppingClient().listCategories(input);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const input = groupFiltersSchema.parse(req.query);
    const data = await darkShoppingClient().listGroups(input);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/attributes",
  asyncHandler(async (req, res) => {
    const input = paginationSchema.parse(req.query);
    const data = await darkShoppingClient().listAttributes(input);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/products/top",
  asyncHandler(async (_req, res) => {
    const data = await darkShoppingClient().listTopProducts();
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const input = productFiltersSchema.parse(req.query);
    const data = await darkShoppingClient().listProducts(input);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const id = positiveInteger.parse(req.params.id);
    const data = await darkShoppingClient().viewProduct(id);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/balance",
  asyncHandler(async (_req, res) => {
    const data = await darkShoppingClient().getBalance();
    res.json({ data });
  }),
);

darkShoppingRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        productId: positiveInteger,
        quantity: positiveInteger.max(100_000),
        promoCode: z.string().trim().min(1).max(100).optional(),
        sendEmailCopy: z.boolean().optional(),
        idempotenceId: z.string().trim().min(1).max(255),
      })
      .parse(req.body);
    const data = await darkShoppingClient().createOrder(input);
    res.status(201).json({ data });
  }),
);

darkShoppingRouter.get(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const id = positiveInteger.parse(req.params.id);
    const data = await darkShoppingClient().getOrderStatus(id);
    res.json({ data });
  }),
);

darkShoppingRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const id = positiveInteger.parse(req.params.id);
    const data = await darkShoppingClient().downloadOrder(id);
    res.json({ data });
  }),
);

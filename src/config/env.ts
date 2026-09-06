import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const CANONICAL_APP_ORIGIN = "https://ysello.com";
export const CANONICAL_API_ORIGIN = "https://api.ysello.com";
export const TRUSTED_APP_ORIGINS = [
  CANONICAL_APP_ORIGIN,
  "https://www.ysello.com",
] as const;

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const trimmedStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

function railwayPublicOrigin() {
  const raw = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (!raw) return undefined;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    url.protocol = "https:";
    return url.origin;
  } catch {
    return undefined;
  }
}

function productionPublicFallback(canonicalOrigin: string) {
  return railwayPublicOrigin() ?? canonicalOrigin;
}

export function normalizeDeploymentPublicUrl(
  value: unknown,
  canonicalOrigin: string,
) {
  if (typeof value !== "string") {
    return process.env.NODE_ENV === "production"
      ? productionPublicFallback(canonicalOrigin)
      : value;
  }

  const raw = value.trim();
  if (process.env.NODE_ENV !== "production") return raw;

  const fallback = productionPublicFallback(canonicalOrigin);
  if (!raw) return fallback;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(candidate);
    const isPrivateHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.endsWith(".internal") ||
      url.hostname.endsWith(".local");

    if (!["http:", "https:"].includes(url.protocol) || isPrivateHost) {
      return fallback;
    }

    if (url.protocol === "http:") url.protocol = "https:";
    return url.pathname === "/" && !url.search && !url.hash
      ? url.origin
      : url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

const deploymentPublicUrl = (canonicalOrigin: string) =>
  z.preprocess(
    (value) => normalizeDeploymentPublicUrl(value, canonicalOrigin),
    z.string().url(),
  );

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  return value;
}, z.boolean());

const darkShoppingApiBaseUrl = z.preprocess(
  trimmedStringToUndefined,
  z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "dark.shopping" &&
        !url.port &&
        !url.username &&
        !url.password &&
        url.pathname.replace(/\/+$/, "") === "/api/v1" &&
        !url.search &&
        !url.hash
      );
    }, "must be the official https://dark.shopping/api/v1 endpoint")
    .default("https://dark.shopping/api/v1"),
);


const shop2TopupApiBaseUrl = z.preprocess(
  trimmedStringToUndefined,
  z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "shop2topup.com" &&
        !url.port &&
        !url.username &&
        !url.password &&
        url.pathname.replace(/\/+$/, "") === "/api/endpoints/v1" &&
        !url.search &&
        !url.hash
      );
    }, "must be the official https://shop2topup.com/api/endpoints/v1 endpoint")
    .default("https://shop2topup.com/api/endpoints/v1"),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: deploymentPublicUrl(CANONICAL_APP_ORIGIN),
  API_URL: deploymentPublicUrl(CANONICAL_API_ORIGIN),
  CORS_ORIGIN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
  JWT_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.preprocess(
    trimmedStringToUndefined,
    z
      .string()
      .min(20)
      .regex(
        /^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/,
        "must be a Google OAuth web client ID",
      )
      .optional(),
  ),
  GOOGLE_CLIENT_SECRET: z.preprocess(
    trimmedStringToUndefined,
    z.string().min(20).optional(),
  ),
  GOOGLE_REDIRECT_URI: z.preprocess(
    trimmedStringToUndefined,
    z.string().url().optional(),
  ),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  SHORT_REFRESH_TOKEN_HOURS: z.coerce.number().int().positive().default(24),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SMTP_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(3).optional()),
  ADMIN_NOTIFICATION_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().email().optional(),
  ),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  PRIVATE_UPLOAD_DIR: z.string().min(1).default("private-uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(8_388_608),
  MAX_PRODUCT_FILE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(104_857_600),
  TURNSTILE_REQUIRED: booleanFromEnv.default(false),
  TURNSTILE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  BANK_TRANSFER_INSTRUCTIONS: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  CRYPTO_PAYMENT_INSTRUCTIONS: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),
  CRYPTO_PAYMENT_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  CRYPTO_PAYMENT_ASSET: z.preprocess(
    emptyToUndefined,
    z.string().default("USDT"),
  ),
  CRYPTO_PAYMENT_NETWORK: z.preprocess(
    emptyToUndefined,
    z.string().default("TRC20"),
  ),
  CRYPTO_PAYMENT_TIMEOUT_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(240)
    .default(30),
  CRYPTO_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  SHOP2TOPUP_API_KEY: z.preprocess(
    trimmedStringToUndefined,
    z.string().min(3).max(512).optional(),
  ),
  SHOP2TOPUP_API_BASE_URL: shop2TopupApiBaseUrl,
  SHOP2TOPUP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(30_000)
    .default(15_000),
  SHOP2TOPUP_MARGIN_PERCENT: z.coerce
    .number()
    .int()
    .min(0)
    .max(500)
    .default(20),
  SHOP2TOPUP_WEBHOOK_SECRET: z.preprocess(
    trimmedStringToUndefined,
    z.string().min(16).max(512).optional(),
  ),
  SHOP2TOPUP_WEBHOOK_PUBLIC_URL: z.preprocess(
    trimmedStringToUndefined,
    z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:", "must use HTTPS")
      .optional(),
  ),
  DARK_SHOPPING_API_KEY: z.preprocess(
    trimmedStringToUndefined,
    z.string().min(1).max(255).optional(),
  ),
  DARK_SHOPPING_API_BASE_URL: darkShoppingApiBaseUrl,
  DARK_SHOPPING_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(30_000)
    .default(15_000),
  DARK_SHOPPING_MARGIN_PERCENT: z.coerce
    .number()
    .int()
    .min(0)
    .max(500)
    .default(30),
  DARK_SHOPPING_RUB_PER_USD: z.coerce
    .number()
    .positive()
    .max(10_000)
    .default(91.5),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_TRC20_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().default("TDffsBmuyrMsNEQXzzLYfzAwz7W6Jmvb1W"),
  ),
  TOPUP_ERC20_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().default("0x5fe0bc617b00812396560e00a47b68a4d19933df"),
  ),
  TOPUP_BEP20_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().default("0x5fe0bc617b00812396560e00a47b68a4d19933df"),
  ),
  TOPUP_BTC_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().default("1CRoGe5BKjSTYBjxjPaS5NRCP8eyZ8cSpA"),
  ),
  TOPUP_ETH_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().default("0x5fe0bc617b00812396560e00a47b68a4d19933df"),
  ),
  TOPUP_SOL_ADDRESS: z.preprocess(emptyToUndefined, z.string().optional()),
  TOPUP_FEE_TRC20_CENTS: z.coerce.number().int().min(0).default(100),
  TOPUP_FEE_BEP20_CENTS: z.coerce.number().int().min(0).default(15),
  TOPUP_FEE_ERC20_CENTS: z.coerce.number().int().min(0).default(450),
  TOPUP_FEE_BTC_CENTS: z.coerce.number().int().min(0).default(250),
  TOPUP_FEE_ETH_CENTS: z.coerce.number().int().min(0).default(350),
  COMMISSION_SALE_PERCENT: z.coerce.number().int().min(0).max(50).default(10),
  COMMISSION_WITHDRAW_PERCENT: z.coerce
    .number()
    .int()
    .min(0)
    .max(20)
    .default(0),
  FROZEN_HOLD_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  DOWNLOAD_LINK_EXPIRY_DAYS: z.coerce.number().int().min(1).max(30).default(7),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsed.data.TURNSTILE_REQUIRED && !parsed.data.TURNSTILE_SECRET_KEY) {
  throw new Error(
    "TURNSTILE_SECRET_KEY is required when TURNSTILE_REQUIRED=true",
  );
}

if (
  Boolean(parsed.data.GOOGLE_CLIENT_ID) !==
  Boolean(parsed.data.GOOGLE_CLIENT_SECRET)
) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
  );
}

if (parsed.data.NODE_ENV === "production") {
  for (const key of ["APP_URL", "API_URL"] as const) {
    const url = new URL(parsed.data[key]);
    if (url.protocol !== "https:") {
      throw new Error(`${key} must use HTTPS in production`);
    }
    if (url.username || url.password) {
      throw new Error(`${key} must not include credentials`);
    }
    if (key === "APP_URL" && (url.pathname !== "/" || url.search || url.hash)) {
      throw new Error(
        "APP_URL must be the preferred public origin without a path, query, or fragment",
      );
    }
  }

  if (parsed.data.GOOGLE_REDIRECT_URI) {
    const redirectUrl = new URL(parsed.data.GOOGLE_REDIRECT_URI);
    if (
      redirectUrl.protocol !== "https:" ||
      redirectUrl.username ||
      redirectUrl.password ||
      redirectUrl.search ||
      redirectUrl.hash
    ) {
      throw new Error(
        "GOOGLE_REDIRECT_URI must be a public HTTPS URL without credentials, query, or fragment",
      );
    }
  }
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

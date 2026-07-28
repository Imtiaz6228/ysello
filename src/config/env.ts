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

export function normalizeDeploymentPublicUrl(
  value: unknown,
  canonicalOrigin: string,
) {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw || process.env.NODE_ENV !== "production") return raw;

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

    if (isPrivateHost) return canonicalOrigin;
    if (url.protocol === "http:") url.protocol = "https:";
    return url.pathname === "/" && !url.search && !url.hash
      ? url.origin
      : url.toString().replace(/\/$/, "");
  } catch {
    return raw;
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
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

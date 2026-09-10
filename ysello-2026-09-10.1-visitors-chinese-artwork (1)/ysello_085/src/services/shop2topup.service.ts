import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";
import { Shop2TopupClient } from "./shop2topup.client.js";

export const SHOP2TOPUP_SETTINGS_URL =
  "https://portal.shop2topup.com/en/shoppanel/api_access";
export const SHOP2TOPUP_DOCUMENTATION_URL =
  "https://shop2topup.com/en/reseller-api";

const client = env.SHOP2TOPUP_API_KEY
  ? new Shop2TopupClient({
      apiKey: env.SHOP2TOPUP_API_KEY,
      baseUrl: env.SHOP2TOPUP_API_BASE_URL,
      timeoutMs: env.SHOP2TOPUP_TIMEOUT_MS,
    })
  : null;

export function shop2TopupClient() {
  if (!client) {
    throw new ApiError(
      503,
      "SHOP2TOPUP is not configured. Add SHOP2TOPUP_API_KEY to the Railway API service.",
      "SHOP2TOPUP_NOT_CONFIGURED",
    );
  }
  return client;
}

export function shop2TopupConfiguration() {
  return {
    configured: Boolean(client),
    webhookSecretConfigured: Boolean(env.SHOP2TOPUP_WEBHOOK_SECRET),
    baseUrl: env.SHOP2TOPUP_API_BASE_URL,
    timeoutMs: env.SHOP2TOPUP_TIMEOUT_MS,
    marginPercent: env.SHOP2TOPUP_MARGIN_PERCENT,
    settingsUrl: SHOP2TOPUP_SETTINGS_URL,
    documentationUrl: SHOP2TOPUP_DOCUMENTATION_URL,
    webhookUrl:
      env.SHOP2TOPUP_WEBHOOK_PUBLIC_URL ??
      `${env.API_URL.replace(/\/$/, "")}/api/webhooks/shop2topup`,
    secretStorage: "server_environment",
  };
}

export async function shop2TopupStatus() {
  const configuration = shop2TopupConfiguration();
  if (!client) {
    return {
      configuration,
      access: {
        status: "not_configured" as const,
        message: "SHOP2TOPUP_API_KEY is missing from this API process.",
        providerStatus: null,
      },
      account: null,
    };
  }
  try {
    const account = await client.getAccount();
    return {
      configuration,
      access: {
        status: account.enabled ? ("ready" as const) : ("disabled" as const),
        message: account.enabled
          ? "SHOP2TOPUP API access is active."
          : "SHOP2TOPUP authenticated this key, but the reseller account is disabled.",
        providerStatus: 200,
      },
      account,
    };
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 502;
    const code = error instanceof ApiError ? error.code : "SHOP2TOPUP_UNAVAILABLE";
    return {
      configuration,
      access: {
        status:
          code === "ACCOUNT_DISABLED"
            ? ("disabled" as const)
            : code === "ACCOUNT_FROZEN"
              ? ("frozen" as const)
              : code === "IP_NOT_ALLOWED"
                ? ("ip_not_allowed" as const)
                : statusCode === 401
                  ? ("invalid_key" as const)
                  : statusCode === 403
                    ? ("access_denied" as const)
                    : statusCode === 429
                      ? ("rate_limited" as const)
                      : ("unavailable" as const),
        message: error instanceof Error ? error.message : "SHOP2TOPUP is unavailable.",
        providerStatus: statusCode,
        code,
      },
      account: null,
    };
  }
}

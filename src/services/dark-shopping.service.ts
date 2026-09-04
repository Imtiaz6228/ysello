import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";
import { DarkShoppingClient } from "./dark-shopping.client.js";

const client = env.DARK_SHOPPING_API_KEY
  ? new DarkShoppingClient({
      apiKey: env.DARK_SHOPPING_API_KEY,
      baseUrl: env.DARK_SHOPPING_API_BASE_URL,
      timeoutMs: env.DARK_SHOPPING_TIMEOUT_MS,
    })
  : null;

export function darkShoppingConfiguration() {
  return {
    configured: Boolean(client),
    baseUrl: env.DARK_SHOPPING_API_BASE_URL,
    requestsPerSecond: 2,
    marginPercent: env.DARK_SHOPPING_MARGIN_PERCENT,
    documentationUrl: "https://dark.shopping/developer",
  };
}

export function darkShoppingClient() {
  if (!client) {
    throw new ApiError(
      503,
      "Dark Shopping is not configured. Add DARK_SHOPPING_API_KEY to the server environment.",
      "DARK_SHOPPING_NOT_CONFIGURED",
    );
  }

  return client;
}

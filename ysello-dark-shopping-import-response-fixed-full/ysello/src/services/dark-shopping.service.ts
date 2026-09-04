import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";
import {
  DARK_SHOPPING_GLOBAL_MARGIN_PERCENT,
  DarkShoppingClient,
} from "./dark-shopping.client.js";

const EXPECTED_REPOSITORY = "Imtiaz6228/ysello";
const EXPECTED_BRANCH = "main";
const DARK_SHOPPING_API_SETTINGS_URL =
  "https://dark.shopping/customer/settings/api";
const DARK_SHOPPING_INTEGRATION_VERSION = "2026-09-04.4";

export type DarkShoppingSupplierAccessStatus =
  | "ready"
  | "not_configured"
  | "invalid_key"
  | "access_denied"
  | "rate_limited"
  | "unavailable";

export type DarkShoppingSupplierAccess = {
  status: DarkShoppingSupplierAccessStatus;
  message: string;
  providerStatus: number | null;
  settingsUrl: string;
};

function runtimeValue(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function railwayRepository() {
  const owner = runtimeValue("RAILWAY_GIT_REPO_OWNER");
  const name = runtimeValue("RAILWAY_GIT_REPO_NAME");
  return owner && name ? `${owner}/${name}` : name;
}

const client = env.DARK_SHOPPING_API_KEY
  ? new DarkShoppingClient({
      apiKey: env.DARK_SHOPPING_API_KEY,
      baseUrl: env.DARK_SHOPPING_API_BASE_URL,
      timeoutMs: env.DARK_SHOPPING_TIMEOUT_MS,
    })
  : null;

export function darkShoppingSupplierAccessError(
  error: unknown,
): DarkShoppingSupplierAccess {
  const providerStatus = error instanceof ApiError ? error.statusCode : null;

  if (providerStatus === 401) {
    return {
      status: "invalid_key",
      message:
        "Dark Shopping rejected the configured API key. Generate a new key in the approved Dark Shopping account and update the Railway API service.",
      providerStatus,
      settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
    };
  }

  if (providerStatus === 403) {
    return {
      status: "access_denied",
      message:
        "Dark Shopping recognized the request but denied API access for this account. Complete and obtain approval for the API access application in Dark Shopping account settings.",
      providerStatus,
      settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
    };
  }

  if (providerStatus === 429) {
    return {
      status: "rate_limited",
      message:
        "Dark Shopping temporarily rate-limited this account. Wait a few minutes before retrying.",
      providerStatus,
      settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
    };
  }

  return {
    status: "unavailable",
    message:
      "Dark Shopping could not confirm supplier access. Check the provider account and try again.",
    providerStatus,
    settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
  };
}

export async function darkShoppingSupplierStatus(): Promise<{
  access: DarkShoppingSupplierAccess;
  balance: Awaited<ReturnType<DarkShoppingClient["getBalance"]>> | null;
}> {
  if (!client) {
    return {
      access: {
        status: "not_configured",
        message: "DARK_SHOPPING_API_KEY is missing from this API process.",
        providerStatus: null,
        settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
      },
      balance: null,
    };
  }

  try {
    const balance = await client.getBalance();
    return {
      access: {
        status: "ready",
        message: "Dark Shopping API access is active.",
        providerStatus: 200,
        settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
      },
      balance,
    };
  } catch (error) {
    return { access: darkShoppingSupplierAccessError(error), balance: null };
  }
}

export function darkShoppingConfiguration() {
  const repository = railwayRepository();
  const branch = runtimeValue("RAILWAY_GIT_BRANCH");
  const commit = runtimeValue("RAILWAY_GIT_COMMIT_SHA");

  return {
    configured: Boolean(client),
    integrationVersion: DARK_SHOPPING_INTEGRATION_VERSION,
    configurationIssue: client
      ? null
      : "DARK_SHOPPING_API_KEY is missing from this API process.",
    baseUrl: env.DARK_SHOPPING_API_BASE_URL,
    requestsPerSecond: 2,
    marginPercent: DARK_SHOPPING_GLOBAL_MARGIN_PERCENT,
    documentationUrl: "https://dark.shopping/developer",
    settingsUrl: DARK_SHOPPING_API_SETTINGS_URL,
    deployment: {
      project: runtimeValue("RAILWAY_PROJECT_NAME"),
      service: runtimeValue("RAILWAY_SERVICE_NAME"),
      environment: runtimeValue("RAILWAY_ENVIRONMENT_NAME"),
      repository,
      branch,
      commit: commit?.slice(0, 12) ?? null,
      expectedRepository: EXPECTED_REPOSITORY,
      expectedBranch: EXPECTED_BRANCH,
      sourceMatchesExpectedRepository: repository
        ? repository.toLowerCase() === EXPECTED_REPOSITORY.toLowerCase()
        : null,
    },
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

import { env } from "../config/env.js";
import { ApiError } from "../middleware/error-handler.js";
import { DarkShoppingClient } from "./dark-shopping.client.js";

const EXPECTED_REPOSITORY = "Imtiaz6228/ysello";
const EXPECTED_BRANCH = "main";

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

export function darkShoppingConfiguration() {
  const repository = railwayRepository();
  const branch = runtimeValue("RAILWAY_GIT_BRANCH");
  const commit = runtimeValue("RAILWAY_GIT_COMMIT_SHA");

  return {
    configured: Boolean(client),
    configurationIssue: client
      ? null
      : "DARK_SHOPPING_API_KEY is missing from this API process.",
    baseUrl: env.DARK_SHOPPING_API_BASE_URL,
    requestsPerSecond: 2,
    marginPercent: env.DARK_SHOPPING_MARGIN_PERCENT,
    documentationUrl: "https://dark.shopping/developer",
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

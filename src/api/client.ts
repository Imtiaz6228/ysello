export type Role =
  "CUSTOMER" | "SELLER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const STAFF_ROLES: Role[] = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function homePathForRole(role: Role) {
  if (STAFF_ROLES.includes(role)) return "/admin";
  if (role === "SELLER") return "/seller";
  return "/dashboard";
}

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  city?: string | null;
  profileImageUrl?: string | null;
  role: Role;
  isSuspended: boolean;
  emailVerified: boolean;
  balanceCents: number;
  sellerBalanceCents: number;
  createdAt: string;
};

export type SellerApplication = {
  id: string;
  userId: string;
  userName: string;
  fullLegalName: string;
  phoneNumber: string;
  email: string;
  country: string;
  stateProvince: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  storeName: string;
  documentName?: string | null;
  documentType?: "ID_CARD" | "PASSPORT" | null;
  documentNumber?: string | null;
  documentFrontOriginalName?: string | null;
  documentFrontMimeType?: string | null;
  documentBackOriginalName?: string | null;
  documentBackMimeType?: string | null;
  storeDescription: string;
  productCategories: string[];
  termsAccepted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "email" | "username" | "role">;
};

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

function normalizeApiBaseUrl(value: string | undefined) {
  return (value?.trim() || "").replace(/\/+$/, "").replace(/(?:\/api)+$/i, "");
}

// `import.meta.env` is injected by Vite. The fallback keeps shared content
// modules safe to import during the build-time HTML prerender pass.
const viteEnvironment = import.meta.env || {};
const configuredApiUrl = normalizeApiBaseUrl(
  viteEnvironment.VITE_API_BASE_URL as string | undefined,
);
const useRemoteApi =
  (viteEnvironment.VITE_USE_REMOTE_API as string | undefined)?.trim() ===
  "true";
const API_BASE_URL = useRemoteApi ? configuredApiUrl : "";
if (useRemoteApi && !configuredApiUrl) {
  throw new Error(
    "VITE_API_BASE_URL is required when VITE_USE_REMOTE_API=true.",
  );
}
const csrfExemptUnsafePaths = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);

let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

/**
 * Builds a direct URL for browser-managed downloads. These links cannot use
 * fetch's API fallback, so they must follow the backend selected by the API
 * client instead of always pointing at the frontend origin.
 */
export function apiDownloadUrl(path: string) {
  return apiUrl(path);
}

export function mediaUrl(value?: string | null) {
  if (!value) return "";
  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  )
    return value;
  if (value.startsWith("/uploads/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }
  return value;
}

function networkErrorMessage() {
  return import.meta.env.DEV
    ? "Cannot reach the local authentication service. Start the API server with npm run dev:api and keep the Vite proxy on /api."
    : "Cannot reach the Ysello service. Check the configured API origin and try again.";
}

async function request(path: string, init: RequestInit) {
  try {
    return await fetch(apiUrl(path), init);
  } catch (error) {
    throw new ApiError(networkErrorMessage(), 0, "NETWORK_ERROR", error);
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(
      import.meta.env.DEV
        ? "The local authentication API is not responding with JSON. Make sure npm run dev:api is running on port 4000."
        : "The authentication API is not configured for this deployment. Check the Vercel /api rewrite and Railway public URL, then redeploy.",
      response.status,
      "API_MISCONFIGURED",
    );
  }
}

export async function getCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await request("/api/session/bootstrap", {
    credentials: "include",
  });

  const data = (await readJson(response)) as { csrfToken?: string } | undefined;
  if (!response.ok || !data?.csrfToken) {
    throw new ApiError(
      "Could not initialize secure request token.",
      response.status,
      "CSRF_INITIALIZATION_FAILED",
    );
  }

  csrfToken = data.csrfToken;

  return csrfToken;
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function pathWithoutQuery(path: string) {
  return path.split("?")[0];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === "object" && !(value instanceof FormData)
  );
}

async function refreshSession() {
  const data = await apiRequest<{ user: User; csrfToken: string }>(
    "/api/auth/refresh",
    { method: "POST" },
    false,
  );
  csrfToken = data.csrfToken;

  return data.user;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
  retryOnUnauthorized = true,
  retryOnCsrf = true,
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  let body = options.body ?? null;

  if (
    isUnsafeMethod(method) &&
    !csrfExemptUnsafePaths.has(pathWithoutQuery(path))
  ) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  if (isPlainObject(body)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await request(path, {
    ...options,
    method,
    headers,
    body: body as BodyInit | null,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    path !== "/api/auth/refresh"
  ) {
    await refreshSession();
    return apiRequest<T>(path, options, false, retryOnCsrf);
  }

  const data = await readJson(response);

  if (!response.ok) {
    if (
      response.status === 403 &&
      data?.code === "CSRF_INVALID" &&
      isUnsafeMethod(method) &&
      retryOnCsrf
    ) {
      csrfToken = null;

      return apiRequest<T>(
        path,
        {
          ...options,
          headers: {
            ...Object.fromEntries(new Headers(options.headers).entries()),
            "x-csrf-token": await getCsrfToken(),
          },
        },
        retryOnUnauthorized,
        false,
      );
    }

    throw new ApiError(
      data?.message ?? `Request failed (${response.status}).`,
      response.status,
      data?.code,
      data?.details,
    );
  }

  if (data?.csrfToken) {
    csrfToken = data.csrfToken;
  }

  return data as T;
}

export function resetCsrfToken() {
  csrfToken = null;
}

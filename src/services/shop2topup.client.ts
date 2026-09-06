import { ApiError } from "../middleware/error-handler.js";

export const SHOP2TOPUP_DEFAULT_BASE_URL =
  "https://shop2topup.com/api/endpoints/v1";

type FetchImplementation = typeof fetch;
type JsonRecord = Record<string, unknown>;

type Shop2TopupErrorEnvelope = {
  success?: false;
  error?: { code?: string; message?: string; details?: unknown };
};

export type Shop2TopupAccount = {
  id: number;
  email: string;
  username: string;
  client_type: string;
  wallet: string;
  enabled: boolean;
  verified: boolean;
  created_at: string;
};

export type Shop2TopupBigCategory = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  image_url?: string | null;
};

export type Shop2TopupCategory = {
  id: number;
  name: string;
  description?: string | null;
  big_category_id: number;
  big_category_name: string;
  image?: string | null;
  image_url?: string | null;
};

export type Shop2TopupSubcategory = {
  item_id: number;
  name: string;
  description?: string | null;
  category_id: number;
  category_name: string;
  price: string;
  fulfillment_type?: string | null;
  returns_voucher?: boolean;
};

export type Shop2TopupRequirement = {
  field_name: string;
  data_type: "text" | "number" | "single_select" | "multi_select" | string;
  placeholder?: string | null;
  select_options?: string[];
};

export type Shop2TopupPrice = {
  item_id: number;
  item_name: string;
  unit_price: string;
  currency: string;
  original_price?: string | null;
  discount_applied?: boolean;
  timestamp?: string;
};

export type Shop2TopupOrder = {
  order_id: string;
  status: string;
  player_id?: string | null;
  player_name?: string | null;
  subcategory_name?: string | null;
  quantity?: number;
  charged_amount?: string;
  currency?: string;
  created_at?: string;
  completed_at?: string | null;
  vouchers?: Array<{
    code: string;
    serial_number?: string | null;
    expiry_date?: string | null;
  }>;
  [key: string]: unknown;
};

export type Shop2TopupClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function providerMessage(body: unknown, status: number) {
  if (isRecord(body) && isRecord(body.error)) {
    const code = typeof body.error.code === "string" ? body.error.code : null;
    const message =
      typeof body.error.message === "string" ? body.error.message : null;
    return {
      code: code || `SHOP2TOPUP_HTTP_${status}`,
      message: message || code || `SHOP2TOPUP returned HTTP ${status}.`,
      details: body.error.details,
    };
  }
  return {
    code: `SHOP2TOPUP_HTTP_${status}`,
    message: `SHOP2TOPUP returned HTTP ${status}.`,
    details: undefined,
  };
}

export class Shop2TopupClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: FetchImplementation;

  constructor(options: Shop2TopupClientOptions) {
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl ?? SHOP2TOPUP_DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  private async request<T>(
    pathname: string,
    init: RequestInit = {},
    retry429 = true,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers(init.headers);
      headers.set("Accept", "application/json");
      headers.set("Authorization", `Bearer ${this.apiKey}`);
      if (init.body) headers.set("Content-Type", "application/json");
      const response = await this.fetchImplementation(`${this.baseUrl}${pathname}`, {
        ...init,
        signal: controller.signal,
        headers,
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.status === 429 && retry429) {
        const retryAfter = Math.max(
          1,
          Math.min(60, Number(response.headers.get("retry-after") || 5)),
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1_000));
        return this.request<T>(pathname, init, false);
      }

      const failedEnvelope = body as Shop2TopupErrorEnvelope | null;
      if (!response.ok || failedEnvelope?.success === false) {
        const provider = providerMessage(body, response.status);
        throw new ApiError(
          response.status >= 400 ? response.status : 502,
          provider.message,
          provider.code,
          provider.details,
        );
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(
          504,
          "SHOP2TOPUP did not answer before the server timeout.",
          "SHOP2TOPUP_TIMEOUT",
        );
      }
      throw new ApiError(
        502,
        "SHOP2TOPUP could not be reached from the API server.",
        "SHOP2TOPUP_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAccount() {
    const result = await this.request<{ success: true; account: Shop2TopupAccount }>(
      "/account",
    );
    return result.account;
  }

  async listBigCategories(forUi = true) {
    const result = await this.request<{
      success: true;
      big_categories: Shop2TopupBigCategory[];
    }>(`/catalog/big-categories?for_ui=${forUi ? "true" : "false"}`);
    return result.big_categories ?? [];
  }

  async listCategories(bigCategoryId?: number, forUi = true) {
    const params = new URLSearchParams({ for_ui: forUi ? "true" : "false" });
    if (bigCategoryId) params.set("bigCategoryId", String(bigCategoryId));
    const result = await this.request<{
      success: true;
      categories: Shop2TopupCategory[];
    }>(`/catalog/categories?${params}`);
    return result.categories ?? [];
  }

  async listSubcategories(categoryId?: number) {
    const suffix = categoryId ? `?categoryId=${categoryId}` : "";
    const result = await this.request<{
      success: true;
      subcategories: Shop2TopupSubcategory[];
    }>(`/catalog/subcategories${suffix}`);
    return result.subcategories ?? [];
  }

  async getPrice(itemId: number) {
    const result = await this.request<{ success: true; price: Shop2TopupPrice }>(
      `/catalog/subcategory/${itemId}/price`,
    );
    return result.price;
  }

  async getRequirements(categoryId: number) {
    const result = await this.request<{
      success: true;
      requirements: Shop2TopupRequirement[];
    }>(`/catalog/category/${categoryId}/requirements`);
    return result.requirements ?? [];
  }

  async validatePlayer(
    subCategoryId: number,
    requirements: Record<string, string | number | string[]>,
  ) {
    return this.request<JsonRecord>("/player/validate", {
      method: "POST",
      body: JSON.stringify({ sub_category_id: subCategoryId, ...requirements }),
    });
  }

  async createOrder(input: {
    orderId: string;
    subCategoryId: number;
    quantity: number;
    requirements: Record<string, string | number | string[]>;
    expectedUnitPrice?: string;
  }) {
    const result = await this.request<{ success: true; order: Shop2TopupOrder }>(
      "/orders/create",
      {
        method: "POST",
        body: JSON.stringify({
          order_id: input.orderId,
          sub_category_id: input.subCategoryId,
          quantity: input.quantity,
          requirements: input.requirements,
          ...(input.expectedUnitPrice
            ? { expected_unit_price: input.expectedUnitPrice }
            : {}),
        }),
      },
    );
    return result.order;
  }

  async getOrder(orderId: string) {
    const result = await this.request<{ success: true; order: Shop2TopupOrder }>(
      `/orders/${encodeURIComponent(orderId)}`,
    );
    return result.order;
  }
}

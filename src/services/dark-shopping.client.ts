import { ApiError } from "../middleware/error-handler.js";

export const DARK_SHOPPING_DEFAULT_BASE_URL = "https://dark.shopping/api/v1";
export const DARK_SHOPPING_REQUESTS_PER_SECOND = 2;

type FetchImplementation = typeof fetch;
type RequestMethod = "GET" | "POST";
type RequestValue = string | number | boolean | null | undefined;
type RequestParameters = Record<
  string,
  RequestValue | RequestValue[] | DarkShoppingAttributeFilter[]
>;

type DarkShoppingEnvelope<T> = {
  success: boolean;
  data: T | DarkShoppingRemoteError;
};

type DarkShoppingRemoteError = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

export type DarkShoppingPagination = {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
};

export type DarkShoppingPaginated<T> = {
  items: T[];
  _links?: Record<string, { href: string }>;
  _meta?: DarkShoppingPagination;
};

export type DarkShoppingCategory = {
  id: number;
  name: string;
  icon: string;
};

export type DarkShoppingGroup = {
  id: number;
  category_id: number;
  additional_category_id?: number | null;
  name: string;
};

export type DarkShoppingAttribute = {
  id: number;
  name: string | null;
  filterName: string | null;
  type: "string" | "number" | "bool" | "list" | "checkbox" | "multiple-list";
  items?: Record<string, string> | string[] | null;
  filterDescription?: string | null;
  groups?: DarkShoppingGroup[] | null;
};

export type DarkShoppingProductAttribute = {
  attribute_id: number;
  name: string;
  value: string | number | boolean;
  value_id?: string | number | null;
};

export type DarkShoppingProduct = {
  id: number;
  name: string;
  miniature: string;
  description: string;
  manual: string;
  price: number;
  minimum_order: number;
  quantity: number;
  purchase_counter: number;
  view: number;
  group: DarkShoppingGroup;
  is_manual_order_delivery: 0 | 1 | boolean;
  category: DarkShoppingCategory;
  url: string;
  replacement_terms_public?: string | null;
  guarantee_time_seconds?: number | null;
  rating?: number | string | null;
  invalid_items_percent?: number | null;
  quality_percent?: number | null;
  attributes: DarkShoppingProductAttribute[];
};

export type DarkShoppingBalance = {
  balance: number;
  currency: string;
};

export type DarkShoppingOrderStatus =
  "unpaid" | "in_process" | "completed" | "canceled" | "error" | "refund";

export type DarkShoppingCreatedOrder = {
  status: "ok" | "completed" | "pending";
  id: number;
  link?: string;
  idempotence?: boolean;
};

export type DarkShoppingOrderStatusResult = {
  status: DarkShoppingOrderStatus;
};

export type DarkShoppingOrderDownload = {
  link: string;
};

export type DarkShoppingAttributeFilter = {
  id: number;
  value: string | number | boolean;
  filterType: "include" | "exclude";
};

export type DarkShoppingPaginationInput = {
  page?: number;
  perPage?: number;
};

export type DarkShoppingGroupFilters = DarkShoppingPaginationInput & {
  ids?: number[];
  categoryId?: number;
  name?: string;
};

export type DarkShoppingProductFilters = DarkShoppingPaginationInput & {
  ids?: number[];
  name?: string;
  description?: string;
  categoryId?: number;
  groupId?: number;
  onlyInStock?: boolean;
  onlyExclusive?: boolean;
  deliveryType?: "auto" | "manual";
  minimumOrderFrom?: number;
  minimumOrderTo?: number;
  priceFrom?: number;
  priceTo?: number;
  ratingFrom?: number;
  ratingTo?: number;
  quantityFrom?: number;
  quantityTo?: number;
  filterAttributes?: DarkShoppingAttributeFilter[];
};

export type DarkShoppingOrderInput = {
  productId: number;
  quantity: number;
  promoCode?: string;
  sendEmailCopy?: boolean;
  idempotenceId?: string;
};

export type DarkShoppingClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  minimumRequestIntervalMs?: number;
  fetchImplementation?: FetchImplementation;
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validRemoteStatus(value: unknown, fallback: number) {
  const status = typeof value === "number" ? value : Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : fallback;
}

function productFilters(input: DarkShoppingProductFilters): RequestParameters {
  return {
    ids: input.ids,
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    group_id: input.groupId,
    only_in_stock: input.onlyInStock,
    only_exclusive: input.onlyExclusive,
    delivery_type: input.deliveryType,
    minimum_order_from: input.minimumOrderFrom,
    minimum_order_to: input.minimumOrderTo,
    price_from: input.priceFrom,
    price_to: input.priceTo,
    rating_from: input.ratingFrom,
    rating_to: input.ratingTo,
    quantity_from: input.quantityFrom,
    quantity_to: input.quantityTo,
    filter_attributes: input.filterAttributes,
    page: input.page,
    "per-page": input.perPage,
  };
}

export class DarkShoppingClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly minimumRequestIntervalMs: number;
  private readonly fetchImplementation: FetchImplementation;
  private requestQueue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;

  constructor(options: DarkShoppingClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) throw new Error("Dark Shopping API key is required.");
    const baseUrl = new URL(options.baseUrl ?? DARK_SHOPPING_DEFAULT_BASE_URL);
    if (
      baseUrl.protocol !== "https:" ||
      baseUrl.hostname !== "dark.shopping" ||
      baseUrl.port ||
      baseUrl.username ||
      baseUrl.password ||
      baseUrl.pathname.replace(/\/+$/, "") !== "/api/v1" ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      throw new Error(
        "Dark Shopping API requests must use the official https://dark.shopping/api/v1 endpoint.",
      );
    }

    this.apiKey = apiKey;
    this.baseUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/+$/, "")}`;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.minimumRequestIntervalMs =
      options.minimumRequestIntervalMs ??
      1_000 / DARK_SHOPPING_REQUESTS_PER_SECOND;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  private async throttled<T>(operation: () => Promise<T>) {
    let releaseQueue!: () => void;
    const previousRequest = this.requestQueue;
    this.requestQueue = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    await previousRequest;
    const delay = Math.max(0, this.nextRequestAt - Date.now());
    if (delay) await wait(delay);
    this.nextRequestAt = Date.now() + this.minimumRequestIntervalMs;

    try {
      return await operation();
    } finally {
      releaseQueue();
    }
  }

  private appendParameters(
    target: URLSearchParams,
    parameters: RequestParameters,
  ) {
    for (const [name, value] of Object.entries(parameters)) {
      if (value === undefined || value === null || value === "") continue;

      if (name === "filter_attributes" && Array.isArray(value)) {
        (value as DarkShoppingAttributeFilter[]).forEach((filter, index) => {
          target.append(`filter_attributes[${index}][id]`, String(filter.id));
          target.append(
            `filter_attributes[${index}][value]`,
            typeof filter.value === "boolean"
              ? filter.value
                ? "1"
                : "0"
              : String(filter.value),
          );
          target.append(
            `filter_attributes[${index}][filter_type]`,
            filter.filterType,
          );
        });
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => target.append(`${name}[]`, String(entry)));
        continue;
      }

      target.append(
        name,
        typeof value === "boolean" ? (value ? "1" : "0") : String(value),
      );
    }
  }

  private postParameters(parameters: RequestParameters) {
    const result: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(parameters)) {
      if (value === undefined || value === null || value === "") continue;
      result[name] =
        name === "filter_attributes" && Array.isArray(value)
          ? (value as DarkShoppingAttributeFilter[]).map((filter) => ({
              id: filter.id,
              value: filter.value,
              filter_type: filter.filterType,
            }))
          : value;
    }
    return result;
  }

  private redact<T>(value: T): T {
    if (typeof value === "string") {
      let sanitized = value.split(this.apiKey).join("[REDACTED]");
      try {
        const url = new URL(sanitized);
        if (url.searchParams.has("key")) {
          url.searchParams.delete("key");
          sanitized = url.toString();
        }
      } catch {
        // Not a URL; the direct key replacement above still protects secrets.
      }
      return sanitized as T;
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.redact(entry)) as T;
    }

    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, this.redact(entry)]),
      ) as T;
    }

    return value;
  }

  private providerError(
    responseStatus: number,
    remoteError?: DarkShoppingRemoteError,
  ) {
    const fallbackStatus =
      responseStatus >= 400 && responseStatus <= 599 ? responseStatus : 502;
    const status = validRemoteStatus(remoteError?.status, fallbackStatus);
    const message =
      typeof remoteError?.message === "string" && remoteError.message.trim()
        ? this.redact(remoteError.message.trim())
        : "Dark Shopping could not complete the request.";

    return new ApiError(status, message, "DARK_SHOPPING_API_ERROR", {
      provider: "dark.shopping",
      name:
        typeof remoteError?.name === "string"
          ? this.redact(remoteError.name)
          : undefined,
      code:
        typeof remoteError?.code === "string" ||
        typeof remoteError?.code === "number"
          ? remoteError.code
          : undefined,
      status,
    });
  }

  private async request<T>(
    endpoint: string,
    parameters: RequestParameters = {},
    method: RequestMethod = "GET",
  ) {
    return this.throttled(async () => {
      const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`);
      const headers = new Headers({ accept: "application/json" });
      const init: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      };
      url.searchParams.set("_format", "json");

      if (method === "GET") {
        this.appendParameters(url.searchParams, {
          ...parameters,
          key: this.apiKey,
        });
      } else {
        headers.set("content-type", "application/json");
        init.body = JSON.stringify(
          this.postParameters({ ...parameters, key: this.apiKey }),
        );
      }

      let response: Response;
      try {
        response = await this.fetchImplementation(url, init);
      } catch (error) {
        const timedOut =
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError");
        throw new ApiError(
          503,
          timedOut
            ? "Dark Shopping did not respond before the request timed out."
            : "Dark Shopping is temporarily unreachable.",
          timedOut ? "DARK_SHOPPING_TIMEOUT" : "DARK_SHOPPING_UNAVAILABLE",
        );
      }

      const responseText = await response.text();
      let envelope: DarkShoppingEnvelope<T> | undefined;
      try {
        envelope = responseText
          ? (JSON.parse(responseText) as DarkShoppingEnvelope<T>)
          : undefined;
      } catch {
        throw new ApiError(
          502,
          "Dark Shopping returned an invalid response.",
          "DARK_SHOPPING_INVALID_RESPONSE",
        );
      }

      if (!envelope || typeof envelope.success !== "boolean") {
        throw new ApiError(
          502,
          "Dark Shopping returned an invalid response.",
          "DARK_SHOPPING_INVALID_RESPONSE",
        );
      }

      if (!response.ok || !envelope.success) {
        throw this.providerError(
          response.status,
          isRecord(envelope.data) ? envelope.data : undefined,
        );
      }

      return this.redact(envelope.data as T);
    });
  }

  listCategories(input: DarkShoppingPaginationInput = {}) {
    return this.request<DarkShoppingPaginated<DarkShoppingCategory>>(
      "category/list",
      { page: input.page, "per-page": input.perPage },
    );
  }

  listGroups(input: DarkShoppingGroupFilters = {}) {
    return this.request<DarkShoppingPaginated<DarkShoppingGroup>>(
      "group/list",
      {
        ids: input.ids,
        category_id: input.categoryId,
        name: input.name,
        page: input.page,
        "per-page": input.perPage,
      },
    );
  }

  listAttributes(input: DarkShoppingPaginationInput = {}) {
    return this.request<DarkShoppingPaginated<DarkShoppingAttribute>>(
      "attribute/list",
      { page: input.page, "per-page": input.perPage },
    );
  }

  listProducts(input: DarkShoppingProductFilters = {}) {
    return this.request<DarkShoppingPaginated<DarkShoppingProduct>>(
      "product/list",
      productFilters(input),
      "POST",
    );
  }

  viewProduct(id: number) {
    return this.request<DarkShoppingProduct>("product/view", { id });
  }

  listTopProducts() {
    return this.request<DarkShoppingPaginated<DarkShoppingProduct>>(
      "product/top",
    );
  }

  getBalance() {
    return this.request<DarkShoppingBalance>("user/balance");
  }

  createOrder(input: DarkShoppingOrderInput) {
    return this.request<DarkShoppingCreatedOrder>(
      "order/create",
      {
        product: input.productId,
        quantity: input.quantity,
        promo_code: input.promoCode,
        send_email_copy: input.sendEmailCopy,
        idempotence_id: input.idempotenceId,
      },
      "GET",
    );
  }

  getOrderStatus(id: number) {
    return this.request<DarkShoppingOrderStatusResult>("order/status", { id });
  }

  downloadOrder(id: number) {
    return this.request<DarkShoppingOrderDownload>("order/download", { id });
  }

  async downloadDeliveryFile(deliveryUrl: string, maximumBytes: number) {
    let url: URL;
    try {
      url = new URL(deliveryUrl);
    } catch {
      throw new ApiError(
        502,
        "Dark Shopping returned an invalid delivery URL.",
        "DARK_SHOPPING_DELIVERY_URL_INVALID",
      );
    }
    if (
      url.protocol !== "https:" ||
      url.hostname !== "dark.shopping" ||
      url.port ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/storage/")
    ) {
      throw new ApiError(
        502,
        "Dark Shopping returned an untrusted delivery URL.",
        "DARK_SHOPPING_DELIVERY_URL_INVALID",
      );
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(url, {
        method: "GET",
        headers: { accept: "text/plain, application/octet-stream" },
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      throw new ApiError(
        503,
        timedOut
          ? "The supplier delivery download timed out."
          : "The supplier delivery file is temporarily unavailable.",
        timedOut
          ? "DARK_SHOPPING_TIMEOUT"
          : "DARK_SHOPPING_DELIVERY_UNAVAILABLE",
      );
    }
    if (!response.ok) {
      throw new ApiError(
        502,
        "The supplier delivery file is not available yet.",
        "DARK_SHOPPING_DELIVERY_UNAVAILABLE",
      );
    }
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > maximumBytes) {
      throw new ApiError(
        502,
        "The supplier delivery file is too large.",
        "DARK_SHOPPING_DELIVERY_TOO_LARGE",
      );
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength > maximumBytes) {
      throw new ApiError(
        502,
        "The supplier delivery file is too large.",
        "DARK_SHOPPING_DELIVERY_TOO_LARGE",
      );
    }
    return data;
  }
}

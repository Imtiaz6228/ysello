import { ApiError } from "../middleware/error-handler.js";

export const DARK_SHOPPING_DEFAULT_BASE_URL = "https://dark.shopping/api/v1";
export const DARK_SHOPPING_REQUESTS_PER_SECOND = 2;
export const DARK_SHOPPING_GLOBAL_MARGIN_PERCENT = 30;
export const DARK_SHOPPING_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

type FetchImplementation = typeof fetch;
type RequestMethod = "GET" | "POST";
type PostEncoding = "json" | "multipart";
type RequestValue = string | number | boolean | null | undefined;
type RequestParameters = Record<
  string,
  RequestValue | RequestValue[] | DarkShoppingAttributeFilter[]
>;

type DarkShoppingEnvelope<T> = {
  success: unknown;
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
  group?: DarkShoppingGroup | null;
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

function finiteNumber(value: unknown, fallback: number | null = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function integerNumber(value: unknown, fallback = 0) {
  const parsed = finiteNumber(value, null);
  return parsed === null ? fallback : Math.trunc(parsed);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function booleanFlag(value: unknown) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0" || value == null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no" || normalized === "") return false;
  }
  return Boolean(value);
}

function normalizeCategory(value: unknown): DarkShoppingCategory | null {
  if (!isRecord(value)) return null;
  const id = integerNumber(value.id);
  if (id <= 0) return null;
  return {
    id,
    name: textValue(value.name, `Category ${id}`),
    icon: textValue(value.icon),
  };
}

function normalizeGroup(value: unknown): DarkShoppingGroup | null {
  if (!isRecord(value)) return null;
  const id = integerNumber(value.id);
  if (id <= 0) return null;
  const additionalCategory = finiteNumber(value.additional_category_id, null);
  return {
    id,
    category_id: Math.max(0, integerNumber(value.category_id)),
    additional_category_id:
      additionalCategory === null ? null : Math.trunc(additionalCategory),
    name: textValue(value.name, `Group ${id}`),
  };
}

function normalizeProductAttribute(value: unknown): DarkShoppingProductAttribute | null {
  if (!isRecord(value)) return null;
  const attributeId = integerNumber(value.attribute_id);
  if (attributeId <= 0) return null;
  const rawValue = value.value;
  const normalizedValue =
    typeof rawValue === "string" ||
    typeof rawValue === "number" ||
    typeof rawValue === "boolean"
      ? rawValue
      : textValue(rawValue);
  const valueId = value.value_id;
  return {
    attribute_id: attributeId,
    name: textValue(value.name),
    value: normalizedValue,
    value_id:
      typeof valueId === "string" || typeof valueId === "number"
        ? valueId
        : null,
  };
}

function normalizeProduct(value: unknown): DarkShoppingProduct | null {
  if (!isRecord(value)) return null;
  const id = integerNumber(value.id);
  const price = finiteNumber(value.price, null);
  if (id <= 0 || price === null || price < 0) return null;
  const category = normalizeCategory(value.category) ?? {
    id: 0,
    name: "Uncategorized",
    icon: "",
  };
  const attributes = Array.isArray(value.attributes)
    ? value.attributes.flatMap((entry) => {
        const normalized = normalizeProductAttribute(entry);
        return normalized ? [normalized] : [];
      })
    : [];
  const guarantee = finiteNumber(value.guarantee_time_seconds, null);
  const invalidPercent = finiteNumber(value.invalid_items_percent, null);
  const qualityPercent = finiteNumber(value.quality_percent, null);

  return {
    id,
    name: textValue(value.name, `Dark Shopping product ${id}`),
    miniature: textValue(value.miniature),
    description: textValue(value.description),
    manual: textValue(value.manual),
    price,
    minimum_order: Math.max(1, integerNumber(value.minimum_order, 1)),
    quantity: Math.max(0, integerNumber(value.quantity)),
    purchase_counter: Math.max(0, integerNumber(value.purchase_counter)),
    view: Math.max(0, integerNumber(value.view)),
    group: normalizeGroup(value.group),
    is_manual_order_delivery: booleanFlag(value.is_manual_order_delivery),
    category,
    url: textValue(value.url),
    replacement_terms_public:
      value.replacement_terms_public == null
        ? null
        : textValue(value.replacement_terms_public),
    guarantee_time_seconds: guarantee === null ? null : Math.max(0, guarantee),
    rating:
      value.rating == null || typeof value.rating === "number" || typeof value.rating === "string"
        ? (value.rating as number | string | null | undefined)
        : null,
    invalid_items_percent: invalidPercent,
    quality_percent: qualityPercent,
    attributes,
  };
}

function normalizeLinks(value: unknown) {
  if (!isRecord(value)) return undefined;
  const links: Record<string, { href: string }> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (!isRecord(entry) || typeof entry.href !== "string") continue;
    links[name] = { href: entry.href };
  }
  return Object.keys(links).length ? links : undefined;
}

const DARK_SHOPPING_ORDER_STATUSES = new Set<DarkShoppingOrderStatus>([
  "unpaid",
  "in_process",
  "completed",
  "canceled",
  "error",
  "refund",
]);

function normalizeCreatedOrder(value: unknown): DarkShoppingCreatedOrder {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an invalid order response.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  const id = integerNumber(value.id);
  const rawStatus = textValue(value.status).trim().toLowerCase();
  if (id <= 0 || !["ok", "completed", "pending"].includes(rawStatus)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an invalid order response.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  const link = textValue(value.link).trim();
  return {
    id,
    status: rawStatus as DarkShoppingCreatedOrder["status"],
    link: link || undefined,
    idempotence:
      value.idempotence == null ? undefined : booleanFlag(value.idempotence),
  };
}

function normalizeOrderStatus(value: unknown): DarkShoppingOrderStatusResult {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an invalid order status response.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  const status = textValue(value.status).trim().toLowerCase() as DarkShoppingOrderStatus;
  if (!DARK_SHOPPING_ORDER_STATUSES.has(status)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an unknown order status.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  return { status };
}

function normalizeOrderDownload(value: unknown): DarkShoppingOrderDownload {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an invalid delivery response.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  const link = textValue(value.link).trim();
  if (!link) {
    throw new ApiError(
      502,
      "Dark Shopping did not provide a delivery link for the completed order.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  return { link };
}

function normalizePagination(value: unknown): DarkShoppingPagination | undefined {
  if (!isRecord(value)) return undefined;
  return {
    totalCount: Math.max(0, integerNumber(value.totalCount)),
    pageCount: Math.max(0, integerNumber(value.pageCount)),
    currentPage: Math.max(1, integerNumber(value.currentPage, 1)),
    perPage: Math.max(1, integerNumber(value.perPage, 20)),
  };
}

function normalizePaginated<T>(
  value: unknown,
  normalizeItem: (item: unknown) => T | null,
): DarkShoppingPaginated<T> {
  if (!isRecord(value)) {
    throw new ApiError(
      502,
      "Dark Shopping returned an invalid catalog response.",
      "DARK_SHOPPING_INVALID_RESPONSE",
    );
  }
  const rawItems = Array.isArray(value.items) ? value.items : [];
  return {
    items: rawItems.flatMap((item) => {
      const normalized = normalizeItem(item);
      return normalized ? [normalized] : [];
    }),
    _links: normalizeLinks(value._links),
    _meta: normalizePagination(value._meta),
  };
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
    target: { append(name: string, value: string): void },
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

  private jsonParameters(parameters: RequestParameters) {
    const output: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(parameters)) {
      if (value === undefined || value === null || value === "") continue;
      if (name === "filter_attributes" && Array.isArray(value)) {
        output[name] = (value as DarkShoppingAttributeFilter[]).map((filter) => ({
          id: filter.id,
          value: filter.value,
          filter_type: filter.filterType,
        }));
        continue;
      }
      output[name] = value;
    }
    return output;
  }

  private invalidResponseError(
    response: Response,
    endpoint: string,
    method: RequestMethod,
    responseBytes: number,
  ) {
    const contentType = response.headers.get("content-type") ?? "unknown";
    const status = response.status || 502;
    const statusMessage = !response.ok
      ? `Dark Shopping returned HTTP ${status} instead of a valid JSON API response.`
      : "Dark Shopping returned a non-JSON API response.";
    return new ApiError(
      status >= 400 && status <= 599 ? status : 502,
      `${statusMessage} Retry the supplier request; if it continues, check Dark Shopping API access and gateway status.`,
      "DARK_SHOPPING_INVALID_RESPONSE",
      {
        provider: "dark.shopping",
        endpoint,
        method,
        providerStatus: status,
        contentType,
        responseBytes,
      },
    );
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
    postEncoding: PostEncoding = "json",
  ) {
    return this.throttled(async () => {
      const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`);
      // Dark Shopping's official PHP client sends this browser-compatible
      // identity. Match it so provider-side bot/WAF rules do not reject
      // otherwise authorized server requests from Railway.
      const headers = new Headers({
        accept: "application/json",
        "user-agent": DARK_SHOPPING_USER_AGENT,
      });
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
      } else if (postEncoding === "multipart") {
        // Dark.shopping explicitly documents multipart form-data as a supported
        // POST transport. Let fetch set the boundary automatically.
        const body = new FormData();
        this.appendParameters(body, { ...parameters, key: this.apiKey });
        init.body = body;
      } else {
        // Dark.shopping explicitly documents JSON for POST requests, including
        // array filters such as ids. Keep the API key in the request body.
        headers.set("content-type", "application/json");
        init.body = JSON.stringify(
          this.jsonParameters({ ...parameters, key: this.apiKey }),
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
      const normalizedResponseText = responseText.replace(/^\uFEFF/, "").trim();
      let envelope: DarkShoppingEnvelope<T> | undefined;
      try {
        envelope = normalizedResponseText
          ? (JSON.parse(normalizedResponseText) as DarkShoppingEnvelope<T>)
          : undefined;
      } catch {
        throw this.invalidResponseError(
          response,
          endpoint,
          method,
          Buffer.byteLength(responseText),
        );
      }

      if (!envelope || !isRecord(envelope)) {
        throw this.invalidResponseError(
          response,
          endpoint,
          method,
          Buffer.byteLength(responseText),
        );
      }

      const successFlag =
        envelope.success === true || envelope.success === 1 || envelope.success === "1" || envelope.success === "true"
          ? true
          : envelope.success === false || envelope.success === 0 || envelope.success === "0" || envelope.success === "false"
            ? false
            : null;
      if (successFlag === null) {
        throw this.invalidResponseError(
          response,
          endpoint,
          method,
          Buffer.byteLength(responseText),
        );
      }

      if (!response.ok || !successFlag) {
        throw this.providerError(
          response.status,
          isRecord(envelope.data) ? envelope.data : undefined,
        );
      }

      return this.redact(envelope.data as T);
    });
  }

  async listCategories(input: DarkShoppingPaginationInput = {}) {
    const data = await this.request<unknown>("category/list", {
      page: input.page,
      "per-page": input.perPage,
    });
    return normalizePaginated(data, normalizeCategory);
  }

  async listGroups(input: DarkShoppingGroupFilters = {}) {
    const data = await this.request<unknown>("group/list", {
      ids: input.ids,
      category_id: input.categoryId,
      name: input.name,
      page: input.page,
      "per-page": input.perPage,
    });
    return normalizePaginated(data, normalizeGroup);
  }

  async listAttributes(input: DarkShoppingPaginationInput = {}) {
    const data = await this.request<unknown>("attribute/list", {
      page: input.page,
      "per-page": input.perPage,
    });
    return normalizePaginated(data, (value) => {
      if (!isRecord(value)) return null;
      const id = integerNumber(value.id);
      if (id <= 0) return null;
      return {
        id,
        name: value.name == null ? null : textValue(value.name),
        filterName:
          value.filterName == null ? null : textValue(value.filterName),
        type: textValue(value.type, "string") as DarkShoppingAttribute["type"],
        items:
          Array.isArray(value.items) || isRecord(value.items)
            ? (value.items as DarkShoppingAttribute["items"])
            : null,
        filterDescription:
          value.filterDescription == null
            ? null
            : textValue(value.filterDescription),
        groups: Array.isArray(value.groups)
          ? value.groups.flatMap((entry) => {
              const normalized = normalizeGroup(entry);
              return normalized ? [normalized] : [];
            })
          : null,
      };
    });
  }

  async listProducts(input: DarkShoppingProductFilters = {}) {
    const filters = productFilters(input);
    const requestedIds = [...new Set((input.ids ?? []).filter((id) => id > 0))];
    const hasLargeOrStructuredFilters =
      requestedIds.length > 0 || Boolean(input.filterAttributes?.length);

    const retryableCatalogError = (error: unknown) =>
      error instanceof ApiError &&
      (error.code === "DARK_SHOPPING_INVALID_RESPONSE" ||
        [400, 415, 422, 500, 502, 503, 504].includes(error.statusCode));

    // Dark.shopping documents GET for ordinary catalog browsing and recommends
    // POST only when the request contains large/structured search parameters.
    // Keeping normal admin browsing on GET avoids unnecessary gateway POST
    // failures, while selected-product imports stay off the query string.
    if (!hasLargeOrStructuredFilters) {
      try {
        const data = await this.request<unknown>("product/list", filters, "GET");
        return normalizePaginated(data, normalizeProduct);
      } catch (error) {
        if (!retryableCatalogError(error)) throw error;
        const data = await this.request<unknown>(
          "product/list",
          filters,
          "POST",
          "multipart",
        );
        return normalizePaginated(data, normalizeProduct);
      }
    }

    let lastError: unknown;
    for (const encoding of ["multipart", "json"] as const) {
      try {
        const data = await this.request<unknown>(
          "product/list",
          filters,
          "POST",
          encoding,
        );
        return normalizePaginated(data, normalizeProduct);
      } catch (error) {
        lastError = error;
        if (!retryableCatalogError(error)) throw error;
      }
    }

    // Some Dark.shopping gateway nodes still return 502 for a valid POST body
    // containing ids[]. Imports must not fail just because the bulk-list edge is
    // unhealthy. For an explicit set of IDs, safely fall back to product/view,
    // one product at a time. The client-wide throttle still enforces <=2 req/s.
    if (requestedIds.length) {
      const items: DarkShoppingProduct[] = [];
      for (const id of requestedIds) {
        try {
          items.push(await this.viewProduct(id));
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 404) continue;
          throw error;
        }
      }
      return {
        items,
        _meta: {
          totalCount: items.length,
          pageCount: 1,
          currentPage: 1,
          perPage: Math.max(1, items.length),
        },
      } satisfies DarkShoppingPaginated<DarkShoppingProduct>;
    }

    throw lastError;
  }

  async viewProduct(id: number) {
    const data = await this.request<unknown>("product/view", { id });
    const product = normalizeProduct(data);
    if (!product) {
      throw new ApiError(
        502,
        "Dark Shopping returned an invalid product response.",
        "DARK_SHOPPING_INVALID_RESPONSE",
      );
    }
    return product;
  }

  async listTopProducts() {
    const data = await this.request<unknown>("product/top");
    return normalizePaginated(data, normalizeProduct);
  }

  async getBalance() {
    const data = await this.request<unknown>("user/balance");
    if (!isRecord(data)) {
      throw new ApiError(
        502,
        "Dark Shopping returned an invalid balance response.",
        "DARK_SHOPPING_INVALID_RESPONSE",
      );
    }
    const balance = finiteNumber(data.balance, null);
    if (balance === null) {
      throw new ApiError(
        502,
        "Dark Shopping returned an invalid balance response.",
        "DARK_SHOPPING_INVALID_RESPONSE",
      );
    }
    return {
      balance,
      currency: textValue(data.currency, "RUB") || "RUB",
    };
  }

  async createOrder(input: DarkShoppingOrderInput) {
    const data = await this.request<unknown>(
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
    return normalizeCreatedOrder(data);
  }

  async getOrderStatus(id: number) {
    const data = await this.request<unknown>("order/status", { id });
    return normalizeOrderStatus(data);
  }

  async downloadOrder(id: number) {
    const data = await this.request<unknown>("order/download", { id });
    return normalizeOrderDownload(data);
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

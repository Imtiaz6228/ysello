import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/middleware/error-handler.js";
import {
  DARK_SHOPPING_USER_AGENT,
  DarkShoppingClient,
} from "../src/services/dark-shopping.client.js";

const fakeKey = "test-dark-shopping-key-never-use";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Dark Shopping catalog requests serialize documented filters and redact response links", async () => {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return jsonResponse({
        success: true,
        data: {
          items: [],
          _links: {
            self: {
              href: `https://dark.shopping/api/v1/product/list?key=${fakeKey}&page=1`,
            },
          },
          _meta: {
            totalCount: 0,
            pageCount: 0,
            currentPage: 1,
            perPage: 20,
          },
        },
      });
    },
  });

  const result = await client.listProducts({
    ids: [12, 34],
    onlyInStock: true,
    deliveryType: "auto",
    perPage: 20,
  });
  const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;

  assert.equal(capturedUrl?.pathname, "/api/v1/product/list");
  assert.equal(capturedUrl?.searchParams.has("key"), false);
  assert.equal(capturedUrl?.searchParams.get("_format"), "json");
  assert.deepEqual(body.ids, [12, 34]);
  assert.equal(body.only_in_stock, true);
  assert.equal(body.delivery_type, "auto");
  assert.equal(body["per-page"], 20);
  assert.equal(body.key, fakeKey);
  assert.equal(capturedInit?.method, "POST");
  assert.equal(
    new Headers(capturedInit?.headers).get("accept"),
    "application/json",
  );
  assert.equal(
    new Headers(capturedInit?.headers).get("user-agent"),
    DARK_SHOPPING_USER_AGENT,
  );
  assert.equal(
    new Headers(capturedInit?.headers).get("content-type"),
    "application/json",
  );
  assert.equal(result._links?.self.href.includes(fakeKey), false);
  assert.equal(
    new URL(result._links?.self.href ?? "https://example.com").searchParams.has(
      "key",
    ),
    false,
  );
});

test("Dark Shopping purchases use the official GET transport and idempotency", async () => {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return jsonResponse({
        success: true,
        data: { status: "pending", id: 1458 },
      });
    },
  });

  const result = await client.createOrder({
    productId: 1542,
    quantity: 10,
    promoCode: "SAVE10",
    sendEmailCopy: true,
    idempotenceId: "ysello-order-item-123",
  });
  assert.equal(capturedUrl?.pathname, "/api/v1/order/create");
  assert.equal(capturedUrl?.searchParams.get("key"), fakeKey);
  assert.equal(capturedUrl?.searchParams.get("_format"), "json");
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.body, undefined);
  assert.equal(capturedUrl?.searchParams.get("product"), "1542");
  assert.equal(capturedUrl?.searchParams.get("quantity"), "10");
  assert.equal(capturedUrl?.searchParams.get("promo_code"), "SAVE10");
  assert.equal(capturedUrl?.searchParams.get("send_email_copy"), "1");
  assert.equal(
    capturedUrl?.searchParams.get("idempotence_id"),
    "ysello-order-item-123",
  );
  assert.deepEqual(result, { status: "pending", id: 1458 });
});

test("Dark Shopping rejects non-official API origins before attaching credentials", () => {
  assert.throws(
    () =>
      new DarkShoppingClient({
        apiKey: fakeKey,
        baseUrl: "https://example.com/api/v1",
      }),
    /official https:\/\/dark\.shopping\/api\/v1 endpoint/,
  );
});

test("Dark Shopping product POST filters follow the documented JSON encoding", async () => {
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (_input, init) => {
      capturedInit = init;
      return jsonResponse({ success: true, data: { items: [] } });
    },
  });

  await client.listProducts({
    filterAttributes: [
      { id: 3, value: 2, filterType: "include" },
      { id: 6, value: false, filterType: "exclude" },
    ],
  });
  const body = JSON.parse(String(capturedInit?.body)) as {
    filter_attributes: Array<Record<string, unknown>>;
  };

  assert.deepEqual(body.filter_attributes, [
    { id: 3, value: 2, filter_type: "include" },
    { id: 6, value: false, filter_type: "exclude" },
  ]);
});


test("Dark Shopping accepts a UTF-8 BOM and string success flag", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () =>
      new Response(
        `\uFEFF${JSON.stringify({ success: "true", data: { balance: "10.50", currency: "RUB" } })}`,
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  assert.deepEqual(await client.getBalance(), { balance: 10.5, currency: "RUB" });
});

test("Dark Shopping retries product/list with multipart when JSON transport gets an upstream invalid response", async () => {
  const requests: RequestInit[] = [];
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (_input, init = {}) => {
      requests.push(init);
      if (requests.length === 1) {
        return new Response("<html>Bad Gateway</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        });
      }
      return jsonResponse({ success: true, data: { items: [] } });
    },
  });

  const result = await client.listProducts({ ids: [12, 34] });
  assert.deepEqual(result.items, []);
  assert.equal(requests.length, 2);
  assert.equal(new Headers(requests[0]?.headers).get("content-type"), "application/json");
  assert.equal(requests[1]?.body instanceof FormData, true);
});


test("Dark Shopping normalizes numeric-string supplier fields before they reach the admin UI", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname.endsWith("/user/balance")) {
        return jsonResponse({
          success: true,
          data: { balance: "455.50", currency: "RUB" },
        });
      }
      return jsonResponse({
        success: true,
        data: {
          items: [
            {
              id: "1542",
              name: "Supplier item",
              miniature: "",
              description: null,
              manual: null,
              price: "123.90",
              minimum_order: "2",
              quantity: "8816",
              purchase_counter: "5",
              view: "0",
              group: { id: "52", category_id: "28", name: "Keys" },
              is_manual_order_delivery: "0",
              category: { id: "28", name: "Steam", icon: "" },
              url: "https://dark.shopping/products/view/example",
              attributes: [],
            },
          ],
          _meta: {
            totalCount: "1",
            pageCount: "1",
            currentPage: "1",
            perPage: "20",
          },
        },
      });
    },
  });

  const balance = await client.getBalance();
  assert.deepEqual(balance, { balance: 455.5, currency: "RUB" });

  const products = await client.listProducts({ onlyInStock: true });
  assert.equal(products.items.length, 1);
  assert.equal(products.items[0].id, 1542);
  assert.equal(products.items[0].price, 123.9);
  assert.equal(products.items[0].minimum_order, 2);
  assert.equal(products.items[0].quantity, 8816);
  assert.equal(products.items[0].is_manual_order_delivery, false);
  assert.equal(products.items[0].description, "");
  assert.equal(products._meta?.totalCount, 1);
});

test("Dark Shopping order responses normalize IDs and reject unknown statuses", async () => {
  const responses = new Map([
    ["/api/v1/order/create", { success: true, data: { status: "pending", id: "1458", idempotence: "1" } }],
    ["/api/v1/order/status", { success: true, data: { status: "completed" } }],
    ["/api/v1/order/download", { success: true, data: { link: "https://dark.shopping/storage/order-1458.txt" } }],
  ]);
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input) => {
      const pathname = new URL(String(input)).pathname;
      return jsonResponse(responses.get(pathname));
    },
  });

  assert.deepEqual(
    await client.createOrder({
      productId: 1542,
      quantity: 1,
      idempotenceId: "ysello-order-item-124",
    }),
    { status: "pending", id: 1458, link: undefined, idempotence: true },
  );
  assert.deepEqual(await client.getOrderStatus(1458), { status: "completed" });
  assert.deepEqual(await client.downloadOrder(1458), {
    link: "https://dark.shopping/storage/order-1458.txt",
  });

  const badClient = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () =>
      jsonResponse({ success: true, data: { status: "mystery" } }),
  });
  await assert.rejects(badClient.getOrderStatus(1458), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "DARK_SHOPPING_INVALID_RESPONSE");
    return true;
  });
});

test("Dark Shopping API failures become sanitized application errors", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () =>
      jsonResponse(
        {
          success: false,
          data: {
            name: "Unauthorized",
            message: `Invalid key ${fakeKey}`,
            code: 0,
            status: 401,
          },
        },
        401,
      ),
  });

  await assert.rejects(client.getBalance(), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, "DARK_SHOPPING_API_ERROR");
    assert.equal(error.message.includes(fakeKey), false);
    assert.match(error.message, /\[REDACTED\]/);
    return true;
  });
});

test("Dark Shopping invalid payloads fail closed", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () => new Response("not-json"),
  });

  await assert.rejects(client.getBalance(), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 502);
    assert.equal(error.code, "DARK_SHOPPING_INVALID_RESPONSE");
    return true;
  });
});



test("Dark Shopping read requests back off and recover from HTTP 429", async () => {
  let requests = 0;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    rateLimitRetryDelaysMs: [1, 1, 1],
    fetchImplementation: async () => {
      requests += 1;
      if (requests <= 2) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "content-type": "text/plain", "retry-after": "0" },
        });
      }
      return jsonResponse({
        success: true,
        data: { balance: "10.50", currency: "RUB" },
      });
    },
  });

  assert.deepEqual(await client.getBalance(), { balance: 10.5, currency: "RUB" });
  assert.equal(requests, 3);
});

test("Dark Shopping order/create does not blindly retry provider 429", async () => {
  let requests = 0;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    rateLimitRetryDelaysMs: [1, 1, 1],
    fetchImplementation: async () => {
      requests += 1;
      return jsonResponse(
        {
          success: false,
          data: {
            name: "Too Many Requests",
            message: "Another order is already processing.",
            status: 429,
          },
        },
        429,
      );
    },
  });

  await assert.rejects(
    client.createOrder({
      productId: 1542,
      quantity: 1,
      idempotenceId: "ysello-order-item-rate-limit-test",
    }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 429);
      return true;
    },
  );
  assert.equal(requests, 1);
});

test("Dark Shopping delivery downloads accept only bounded official storage files", async () => {
  let requestInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (_input, init) => {
      requestInit = init;
      return new Response("delivery-row", {
        headers: { "content-length": "12", "content-type": "text/plain" },
      });
    },
  });

  const delivery = await client.downloadDeliveryFile(
    "https://dark.shopping/storage/order.txt",
    100,
  );
  assert.equal(delivery.toString("utf8"), "delivery-row");
  assert.equal(requestInit?.redirect, "error");

  await assert.rejects(
    client.downloadDeliveryFile("https://example.com/storage/order.txt", 100),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "DARK_SHOPPING_DELIVERY_URL_INVALID");
      return true;
    },
  );
});

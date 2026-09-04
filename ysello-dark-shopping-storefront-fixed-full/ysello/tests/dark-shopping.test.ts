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
  const body = new URLSearchParams(String(capturedInit?.body));

  assert.equal(capturedUrl?.pathname, "/api/v1/product/list");
  assert.equal(capturedUrl?.searchParams.has("key"), false);
  assert.equal(capturedUrl?.searchParams.get("_format"), "json");
  assert.deepEqual(body.getAll("ids[]"), ["12", "34"]);
  assert.equal(body.get("only_in_stock"), "1");
  assert.equal(body.get("delivery_type"), "auto");
  assert.equal(body.get("per-page"), "20");
  assert.equal(body.get("key"), fakeKey);
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
    "application/x-www-form-urlencoded;charset=UTF-8",
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

test("Dark Shopping product POST filters follow the documented nested form encoding", async () => {
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
  const body = new URLSearchParams(String(capturedInit?.body));

  assert.equal(body.get("filter_attributes[0][id]"), "3");
  assert.equal(body.get("filter_attributes[0][value]"), "2");
  assert.equal(body.get("filter_attributes[0][filter_type]"), "include");
  assert.equal(body.get("filter_attributes[1][id]"), "6");
  assert.equal(body.get("filter_attributes[1][value]"), "0");
  assert.equal(body.get("filter_attributes[1][filter_type]"), "exclude");
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
